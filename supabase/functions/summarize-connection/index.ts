const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gpt-5.4-nano";
const MAX_TEXT_CHARS = 2000;

interface InHighlight {
  id: number;
  text: string;
  note?: string | null;
  title?: string | null;
  author?: string | null;
  category?: string | null;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, number[]>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(key, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return false;
}

function clip(s: string | null | undefined, n = MAX_TEXT_CHARS): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function validate(h: unknown): InHighlight | null {
  if (!h || typeof h !== "object") return null;
  const o = h as Record<string, unknown>;
  if (typeof o.id !== "number" || typeof o.text !== "string") return null;
  return {
    id: o.id,
    text: o.text,
    note: typeof o.note === "string" ? o.note : null,
    title: typeof o.title === "string" ? o.title : null,
    author: typeof o.author === "string" ? o.author : null,
    category: typeof o.category === "string" ? o.category : null,
  };
}

function buildUserPrompt(a: InHighlight, b: InHighlight, sharedTerms: string[]): string {
  const fmt = (h: InHighlight, label: string) =>
    [
      `${label}:`,
      `  Source: ${h.title || "Untitled"}${h.author ? ` — ${h.author}` : ""}${h.category ? ` (${h.category})` : ""}`,
      `  Highlight: ${clip(h.text)}`,
      h.note ? `  Reader note: ${clip(h.note, 600)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const shared =
    sharedTerms.length > 0
      ? `\n\nShared terms (hints, may be noisy): ${sharedTerms.slice(0, 8).join(", ")}`
      : "";

  return `${fmt(a, "Highlight A")}\n\n${fmt(b, "Highlight B")}${shared}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const a = validate(body.a);
  const b = validate(body.b);
  if (!a || !b) {
    return new Response(JSON.stringify({ error: "Invalid highlights" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sharedTerms = Array.isArray(body.sharedTerms)
    ? (body.sharedTerms as unknown[]).filter((t): t is string => typeof t === "string")
    : [];

  const systemPrompt =
    "You connect ideas across books, articles, and notes. Given two highlights, write a concise 2–3 sentence explanation of the shared insight or tension between them. Be concrete and specific — reference the actual ideas, not generic platitudes. No preamble, no headings, no bullet points. Plain prose only.";
  const userPrompt = buildUserPrompt(a, b, sharedTerms);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: systemPrompt,
        input: userPrompt,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error", res.status, errText.slice(0, 500));
      const status = res.status === 429 ? 429 : 502;
      return new Response(
        JSON.stringify({
          error:
            res.status === 429
              ? "Rate limited by OpenAI. Try again in a moment."
              : "Failed to generate summary",
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    let summary: string = (data?.output_text ?? "").trim();
    if (!summary && Array.isArray(data?.output)) {
      summary = data.output
        .flatMap((o: { content?: Array<{ text?: string }> }) => o.content ?? [])
        .map((c: { text?: string }) => c.text ?? "")
        .join("")
        .trim();
    }
    if (!summary) {
      return new Response(JSON.stringify({ error: "Empty summary" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ summary, model: MODEL }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("summarize-connection error:", msg);
    return new Response(JSON.stringify({ error: "Failed to generate summary" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
