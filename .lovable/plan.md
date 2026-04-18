
## Goal
Cache AI-generated connection summaries in the database, keyed by the unordered highlight pair, so they're reused across sessions instead of re-calling OpenAI.

## Schema
New table `connection_summaries`:
- `highlight_id_a bigint` — always the smaller id
- `highlight_id_b bigint` — always the larger id
- `summary text not null`
- `model text not null`
- `created_at timestamptz default now()`
- PRIMARY KEY `(highlight_id_a, highlight_id_b)`
- CHECK `highlight_id_a < highlight_id_b` (enforces canonical ordering)

RLS:
- Enable RLS
- Public SELECT policy (matches `highlight_embeddings` pattern — app is read-only public)
- No INSERT/UPDATE/DELETE policies for clients; the edge function writes via service role

## Edge function changes (`summarize-connection/index.ts`)
1. Create Supabase client with `SUPABASE_SERVICE_ROLE_KEY`.
2. Compute canonical pair: `[lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]`.
3. Before calling OpenAI: `SELECT summary, model FROM connection_summaries WHERE highlight_id_a=lo AND highlight_id_b=hi`. If hit, return immediately with `{ summary, model, cached: true }`.
4. On miss: call OpenAI as today, then `INSERT ... ON CONFLICT DO NOTHING` and return `{ summary, model, cached: false }`.
5. Cache lookup happens before rate-limit increment so cached hits don't burn quota (rate limit only applies to actual OpenAI calls).

## Frontend
No changes required — response shape stays `{ summary, model }` (with optional `cached` field ignored). Existing in-memory cache in `useConnectionSummary` continues to work as a fast L1 in front of the DB L2.

## Out of scope
- Invalidation on highlight text edits (highlights are immutable in current app)
- Per-user caching (summaries are content-derived, safe to share)
- Backfill of existing pairs
