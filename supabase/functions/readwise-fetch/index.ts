const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const READWISE_BASE = "https://readwise.io/api/v2";
const READER_BASE = "https://readwise.io/api/v3";
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

async function rw(path: string, token: string, base = READWISE_BASE): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Readwise ${path} failed [${res.status}]: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Fetch summaries from the Reader v3 API and key them by source_url for matching
async function fetchReaderSummaries(token: string, neededUrls: Set<string>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (neededUrls.size === 0) return map;
  let cursor: string | null = null;
  let pages = 0;
  while (pages < 8 && map.size < neededUrls.size) {
    const qs = new URLSearchParams({ withHtmlContent: "false" });
    if (cursor) qs.set("pageCursor", cursor);
    const data: any = await rw(`/list/?${qs.toString()}`, token, READER_BASE);
    for (const doc of data.results || []) {
      const url: string | null = doc.source_url || null;
      const summary: string | null = doc.summary || null;
      if (url && summary && neededUrls.has(url) && !map.has(url)) {
        map.set(url, summary);
      }
    }
    cursor = data.nextPageCursor || null;
    if (!cursor) break;
    pages++;
  }
  return map;
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

    // Enrich with Reader API summaries (v2 /books/ doesn't return summaries for articles)
    const neededUrls = new Set<string>();
    for (const h of collected) {
      const b = booksById[h.book_id];
      if (b?.source_url && !b.summary) neededUrls.add(b.source_url);
    }
    let summaryByUrl = new Map<string, string>();
    try {
      summaryByUrl = await fetchReaderSummaries(token, neededUrls);
    } catch (e) {
      console.warn("Reader summary fetch failed (non-fatal):", e instanceof Error ? e.message : e);
    }

    const result = collected.map((h) => {
      const b = booksById[h.book_id];
      const summary =
        b?.summary ?? (b?.source_url ? summaryByUrl.get(b.source_url) ?? null : null);
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
          summary,
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
