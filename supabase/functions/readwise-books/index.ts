import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { normalizeBook } from './normalize.ts';
import { catalogGenres } from './genres.ts';

const BASE = 'https://readwise.io/books/api/v1/';
const TTL = 24 * 60 * 60 * 1000;
const jobs = new Map<string, Promise<any>>();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function api(path: string, token: string) {
  const url = new URL(path, BASE);
  if (url.origin !== 'https://readwise.io' || !url.pathname.startsWith('/books/api/v1/')) throw new Error('Invalid pagination URL');
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Token ${token}` }, signal: AbortSignal.timeout(25000) });
    if (response.status === 429 && attempt < 2) {
      await response.text();
      await new Promise(r => setTimeout(r, Math.min(Number(response.headers.get('Retry-After')) || 5, 30) * 1000));
      continue;
    }
    if (!response.ok) {
      console.error('Readwise Books error', response.status, (await response.text()).slice(0, 300));
      throw new Error('Reading service unavailable');
    }
    return response.json();
  }
  throw new Error('Reading service rate limited');
}

function sync(kind: string, task: () => Promise<any>, db: ReturnType<typeof createClient>) {
  const existing = jobs.get(kind);
  if (existing) return existing;
  const job = (async () => {
    const payload = await task();
    const syncedAt = new Date().toISOString();
    const { error } = await db.from('reading_snapshots').upsert({ kind, payload, synced_at: syncedAt });
    if (error) throw error;
    return { payload, synced_at: syncedAt };
  })().finally(() => jobs.delete(kind));
  jobs.set(kind, job);
  return job;
}

async function library(token: string, db: ReturnType<typeof createClient>) {
  const { data } = await db.from('readwise_snapshots').select('payload').eq('kind', 'pool').maybeSingle();
  const sources = (data?.payload?.highlights || []).map((h: any) => h.book);
  const books: any[] = [];
  let path: string | null = 'books?limit=1000&is_private=false&order=-finished_reading_at';
  let pages = 0;
  while (path) {
    if (++pages > 100) throw new Error('Library pagination exceeded');
    const response = await api(path, token);
    for (const raw of response.results || []) {
      const book = normalizeBook(raw, sources);
      if (book) books.push(book);
    }
    path = response.next || null;
  }
  return { books };
}

async function annual(year: number, token: string) {
  const [summary, daily] = await Promise.all([
    api(`stats/summary?period=year&year=${year}`, token),
    api(`stats/sessions-by-day?from=${year}-01-01&to=${year}-12-31`, token),
  ]);
  return { summary, days: (daily.results || []).map((d: any) => ({ date: d.date, session_count: d.session_count, total_time_seconds: d.total_time_seconds })) };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const currentYear = new Date().getUTCFullYear();
  const parsed = z.object({ year: z.number().int().min(2000).max(currentYear).optional(), sync: z.boolean().optional() }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid reading request' }, 400);
  if (parsed.data.sync) {
    const denied = authenticateCronRequest(req);
    if (denied) return new Response(denied.body, { status: denied.status, headers: corsHeaders });
  }
  const token = Deno.env.get('READWISE_ACCESS_TOKEN');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token || !url || !key) return json({ error: 'Reading service not configured' }, 503);
  const db = createClient(url, key);
  const year = parsed.data.year ?? currentYear;
  try {
    if (parsed.data.sync) {
      const bookCopy = await sync('library', () => library(token, db), db);
      const { data: cachedYears } = await db.from('reading_snapshots').select('kind').like('kind', 'year:%');
      const years = new Set([currentYear, ...(cachedYears || []).map(r => Number(r.kind.slice(5)))]);
      for (const y of years) {
        await sync(`year:${y}`, () => annual(y, token), db);
        await sync(`genres:${y}`, () => catalogGenres(bookCopy.payload.books, y), db);
      }
      return json({ synced: true, year: currentYear });
    }
    async function saved(kind: string, task: () => Promise<any>) {
      const { data, error } = await db.from('reading_snapshots').select('payload,synced_at').eq('kind', kind).maybeSingle();
      if (error) throw error;
      if (data) {
        if (Date.now() - new Date(data.synced_at).getTime() > TTL) {
          const job = sync(kind, task, db).catch(e => console.error('Background reading sync failed', e.message));
          (globalThis as any).EdgeRuntime?.waitUntil(job);
        }
        return data;
      }
      return sync(kind, task, db);
    }
    const [books, stats] = await Promise.all([
      saved('library', () => library(token, db)),
      saved(`year:${year}`, () => annual(year, token)),
    ]);
    const genres = await saved(`genres:${year}`, () => catalogGenres(books.payload.books, year));
    const enriched = books.payload.books.map((b: any) => ({ ...b, genre: genres.payload[b.id]?.genre || null, cover: b.cover || genres.payload[b.id]?.cover || null, fallbackCover: genres.payload[b.id]?.cover || null }));
    return json({ books: enriched, ...stats.payload, year, syncedAt: books.synced_at < stats.synced_at ? books.synced_at : stats.synced_at });
  } catch (e) {
    console.error('Reading dashboard failed', e instanceof Error ? e.message : 'Unknown error');
    return json({ error: 'Could not load reading history. Please try again shortly.' }, 503);
  }
});