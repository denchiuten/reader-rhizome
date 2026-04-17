const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { z } from "npm:zod@3.23.8";

const READWISE_BASE = "https://readwise.io/api/v2";

const BodySchema = z.object({
  query: z.string().min(1).max(500),
  excludeBookId: z.number().optional(),
  limit: z.number().min(1).max(10).default(3),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("READWISE_ACCESS_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "READWISE_ACCESS_TOKEN is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { query, excludeBookId, limit } = parsed.data;

    const url = `${READWISE_BASE}/highlights/search/?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Readwise search failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    // Response shape: { results: [{ id, text, book_id, ... }] }
    const results = (data.results || data || [])
      .filter((r: any) => !excludeBookId || r.book_id !== excludeBookId)
      .slice(0, limit)
      .map((r: any) => ({
        id: r.id,
        text: r.text,
        book_id: r.book_id,
        score: r.score ?? null,
      }));

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("readwise-search error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
