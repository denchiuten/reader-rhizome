const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const READWISE_BASE = "https://readwise.io/api/v2";
const TARGET = 200;
const MAX_HIGHLIGHT_PAGES = 10;

interface RWHighlight {
  id: number;
  text: string;
  note: string | null;
  book_id: number;
  url: string | null;
  highlighted_at: string | null;
  tags?: { name: string }[];
}

interface RWBook {
  id: number;
  title: string;
  author: string | null;
  category: string | null;
  source_url: string | null;
  cover_image_url: string | null;
  summary: string | null;
}

async function rw(path: string, token: string): Promise<any> {
  const res = await fetch(`${READWISE_BASE}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Readwise ${path} failed [${res.status}]: ${body.slice(0, 200)}`);
  }
  return res.json();
}

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

  let categories: string[] | undefined;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.categories) && body.categories.length > 0) {
        categories = body.categories.filter((c: unknown): c is string => typeof c === "string");
      }
    }
  } catch {
    // ignore
  }
  const filterSet = categories && categories.length > 0 ? new Set(categories) : null;

  try {
    // Fetch books once (paginated). 1000 per page covers most users.
    const booksById: Record<number, RWBook> = {};
    let bookPage = 1;
    while (true) {
      const data = await rw(`/books/?page_size=1000&page=${bookPage}`, token);
      for (const b of data.results as RWBook[]) {
        booksById[b.id] = b;
      }
      if (!data.next) break;
      bookPage++;
      if (bookPage > 10) break;
    }

    // Fetch highlights pages until we've collected TARGET matching entries
    const collected: RWHighlight[] = [];
    for (let page = 1; page <= MAX_HIGHLIGHT_PAGES; page++) {
      const data = await rw(`/highlights/?page_size=100&page=${page}`, token);
      const results: RWHighlight[] = data.results || [];
      for (const h of results) {
        if (filterSet) {
          const cat = booksById[h.book_id]?.category;
          if (!cat || !filterSet.has(cat)) continue;
        }
        collected.push(h);
        if (collected.length >= TARGET) break;
      }
      if (collected.length >= TARGET || !data.next) break;
    }

    const result = collected.map((h) => {
      const b = booksById[h.book_id];
      return {
        id: h.id,
        text: h.text,
        note: h.note,
        url: h.url,
        highlighted_at: h.highlighted_at,
        tags: (h.tags || []).map((t) => t.name),
        book: {
          id: h.book_id,
          title: b?.title ?? "Unknown",
          author: b?.author ?? null,
          category: b?.category ?? null,
          source_url: b?.source_url ?? null,
          cover_image_url: b?.cover_image_url ?? null,
          summary: b?.summary ?? null,
        },
      };
    });

    return new Response(JSON.stringify({ highlights: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("readwise-fetch error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
