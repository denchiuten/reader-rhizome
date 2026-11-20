import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const READWISE_BASE = "https://readwise.io/api/v2";
const READER_BASE = "https://readwise.io/api/v3";
const TARGET = 500;
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
  tags?: { name: string }[];
}

interface CachedBook extends Omit<RWBook, "tags"> {
  tags: string[];
}

async function rw(path: string, token: string, base = READWISE_BASE): Promise<any> {
  const url = `${base}${path}`;
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    });
    if (res.status === 429 && attempt < maxAttempts) {
      const body = await res.text();
      const match = body.match(/in (\d+) seconds/);
      const hinted = match ? parseInt(match[1], 10) : 5;
      // Cap waits so we don't blow the function timeout (max ~30s observed)
      const waitMs = Math.min(hinted + 1, 30) * 1000;
      console.warn(`Readwise 429 on ${path}; waiting ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Readwise ${path} failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    return res.json();
  }
  throw new Error(`Readwise ${path} failed after ${maxAttempts} attempts (rate limited)`);
}


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

async function fetchAllBooks(token: string): Promise<Record<number, CachedBook>> {
  const booksById: Record<number, CachedBook> = {};
  let bookPage = 1;
  while (true) {
    const data = await rw(`/books/?page_size=1000&page=${bookPage}`, token);
    for (const b of data.results as RWBook[]) {
      booksById[b.id] = {
        ...b,
        tags: (b.tags || []).map((t) => t.name),
      };
    }
    if (!data.next) break;
    bookPage++;
    if (bookPage > 10) break;
  }
  return booksById;
}

// Basic in-memory rate limiting (per warm instance).
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


interface Snapshot { highlights: unknown[]; tags: string[] }

async function buildSnapshot(token: string): Promise<Snapshot> {
    const booksById = await fetchAllBooks(token);
    const tagSetAll = new Set<string>();
    for (const id in booksById) for (const t of booksById[id].tags) tagSetAll.add(t);
    const tags = [...tagSetAll].sort((a, b) => a.localeCompare(b));
    const collected: RWHighlight[] = [];
    for (let page = 1; page <= MAX_HIGHLIGHT_PAGES; page++) {
      // Small spacing between pages to avoid tripping the per-minute rate limit
      if (page > 1) await new Promise((r) => setTimeout(r, 250));
      const data = await rw(`/highlights/?page_size=100&page=${page}`, token);
      const results: RWHighlight[] = data.results || [];
      for (const h of results) {
        collected.push(h);
        if (collected.length >= TARGET) break;
      }
      if (collected.length >= TARGET || !data.next) break;
    }

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
          tags: b?.tags ?? [],
        },
      };
    });

    return { highlights: result, tags };
}

const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
let syncing: Promise<Snapshot> | null = null;

function syncSnapshot(token: string, db: ReturnType<typeof createClient>): Promise<Snapshot> {
  if (!syncing) {
    syncing = (async () => {
      const snap = await buildSnapshot(token);
      const { error } = await db.from("readwise_snapshots")
        .upsert({ kind: "pool", payload: snap, synced_at: new Date().toISOString() });
      if (error) console.error("snapshot save failed:", error.message);
      return snap;
    })().finally(() => { syncing = null; });
  }
  return syncing;
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

  const token = Deno.env.get("READWISE_ACCESS_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let listTags = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.listTags === true) listTags = true;
    }
  } catch {
    // ignore
  }

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await db.from("readwise_snapshots")
      .select("payload, synced_at").eq("kind", "pool").maybeSingle();
    let snap: Snapshot;
    if (row?.payload) {
      snap = row.payload as Snapshot;
      if (Date.now() - new Date(row.synced_at as string).getTime() > SNAPSHOT_TTL_MS) {
        // Stale: serve instantly, refresh daily copy in the background.
        const job = syncSnapshot(token, db).catch((e) => console.error("background sync failed:", e?.message));
        // deno-lint-ignore no-explicit-any
        (globalThis as any).EdgeRuntime?.waitUntil?.(job);
      }
    } else {
      snap = await syncSnapshot(token, db);
    }
    const payload = listTags ? { tags: snap.tags } : { highlights: snap.highlights };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("readwise-fetch error:", msg);
    return new Response(JSON.stringify({ error: "Failed to fetch highlights" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
