import { corsHeaders } from "@supabase/supabase-js/cors";

const READWISE_BASE = "https://readwise.io/api/v2";

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

  try {
    // Fetch 200 most recent highlights (2 pages of 100)
    const [page1, page2] = await Promise.all([
      rw("/highlights/?page_size=100&page=1", token),
      rw("/highlights/?page_size=100&page=2", token),
    ]);
    const highlights: RWHighlight[] = [...(page1.results || []), ...(page2.results || [])];

    // Fetch books for these highlights
    const bookIds = Array.from(new Set(highlights.map((h) => h.book_id)));
    const books: Record<number, RWBook> = {};
    // Books endpoint paginates; fetch all needed via page_size=1000
    let bookPage = 1;
    while (true) {
      const data = await rw(`/books/?page_size=1000&page=${bookPage}`, token);
      for (const b of data.results as RWBook[]) {
        if (bookIds.includes(b.id)) books[b.id] = b;
      }
      if (!data.next || Object.keys(books).length >= bookIds.length) break;
      bookPage++;
      if (bookPage > 10) break;
    }

    const result = highlights.map((h) => {
      const b = books[h.book_id];
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
