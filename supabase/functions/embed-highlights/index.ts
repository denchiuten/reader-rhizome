import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 96;
const MAX_INPUT_CHARS = 6000; // safety clip per item

interface InputHighlight {
  id: number;
  text: string;
  note?: string | null;
}

// Basic in-memory rate limiting (per warm instance).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
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

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildInputText(h: InputHighlight): string {
  const combined = (h.text || "") + (h.note ? `\n\nNote: ${h.note}` : "");
  return combined.slice(0, MAX_INPUT_CHARS);
}

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let highlights: InputHighlight[] = [];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.highlights) || body.highlights.length > 1000 ||
      body.highlights.some((h: unknown) => {
        if (!h || typeof h !== "object") return true;
        const item = h as Record<string, unknown>;
        return !Number.isSafeInteger(item.id) || (item.id as number) <= 0 ||
          typeof item.text !== "string" || item.text.length > 60000 ||
          (item.note != null && (typeof item.note !== "string" || item.note.length > 60000));
      })) {
      return new Response(JSON.stringify({ error: "Invalid highlights" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    highlights = body.highlights;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (highlights.length === 0) {
    return new Response(JSON.stringify({ embeddings: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Cache identity comes from content, never a caller-selected highlight ID.
    const items = await Promise.all(
      highlights.map(async (h) => {
        const input = buildInputText(h);
        const hash = await sha256(`${MODEL}:${input}`);
        return { id: h.id, input, hash };
      }),
    );

    const uniqueItems = [...new Map(items.map((item) => [item.hash, item])).values()];
    const { data: existing, error: selErr } = await supabase
      .from("content_embeddings")
      .select("text_hash, embedding")
      .in("text_hash", uniqueItems.map((item) => item.hash));
    if (selErr) throw selErr;

    const existingMap = new Map<string, number[] | string>();
    for (const row of existing || []) {
      existingMap.set(row.text_hash as string, row.embedding as unknown as number[] | string);
    }

    const toEmbed: typeof items = [];
    const result = new Map<string, number[]>();

    for (const it of uniqueItems) {
      const cached = existingMap.get(it.hash);
      if (cached) {
        const vec =
          typeof cached === "string"
            ? (JSON.parse(cached) as number[])
            : cached;
        result.set(it.hash, vec);
      } else {
        toEmbed.push(it);
      }
    }

    // Embed missing in batches
    for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
      const batch = toEmbed.slice(i, i + BATCH_SIZE);
      const vectors = await embedBatch(batch.map((b) => b.input), apiKey);
      const rows = batch.map((b, idx) => ({
        text_hash: b.hash,
        // pgvector via PostgREST expects a string literal like "[0.1,0.2,...]"
        embedding: `[${vectors[idx].join(",")}]`,
        model: MODEL,
      }));
      const { error: upErr } = await supabase
        .from("content_embeddings")
        .upsert(rows, { onConflict: "text_hash", ignoreDuplicates: true });
      if (upErr) throw upErr;
      batch.forEach((b, idx) => result.set(b.hash, vectors[idx]));
    }

    const payload = items.map((it) => ({ id: it.id, vector: result.get(it.hash) || [] }));
    return new Response(
      JSON.stringify({ embeddings: payload, model: MODEL, embedded: toEmbed.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg =
      err instanceof Error
        ? `${err.message}${err.stack ? `\n${err.stack}` : ""}`
        : JSON.stringify(err);
    console.error("embed-highlights error:", msg);
    return new Response(
      JSON.stringify({ error: "Failed to compute embeddings" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

