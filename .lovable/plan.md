
## Plan: Semantic embeddings with OpenAI + pgvector

Replace the Jaccard word-overlap algorithm with OpenAI embeddings, stored in Supabase with `pgvector`. Embed each highlight once, recompute similarities client-side from cached vectors.

### 1. Database (migration)
- Enable `pgvector` extension.
- New table `highlight_embeddings`:
  - `highlight_id bigint primary key`
  - `text_hash text not null` (sha256 of `text + note` — re-embed if content changes)
  - `embedding vector(1536)` (matches `text-embedding-3-small`)
  - `model text not null default 'text-embedding-3-small'`
  - `created_at timestamptz default now()`
- RLS: enable, allow `select` to anon (read-only public graph, same posture as current app), no insert/update from clients (only the edge function with service role writes).
- Index: `ivfflat (embedding vector_cosine_ops)` for future SQL-side similarity (not used initially, but cheap to add).

### 2. Secret
- Add `OPENAI_API_KEY` via the secret tool. Wait for user to provide before deploying the function.

### 3. New edge function: `embed-highlights`
- Input: `{ highlights: [{ id, text, note }] }` from the client (after `readwise-fetch` returns).
- For each highlight: compute `text_hash`, look up existing row.
  - If hash matches → reuse cached embedding.
  - If missing or hash differs → batch into OpenAI `text-embedding-3-small` calls (up to 100 inputs per request), upsert into `highlight_embeddings`.
- Returns: `{ embeddings: [{ id, vector: number[] }] }`.
- Same CORS + IP rate limit pattern as `readwise-fetch`.
- Uses service role client to bypass RLS on writes.

### 4. Client changes
- `src/lib/embeddings.ts` (new): `fetchEmbeddings(highlights)` wrapper for the function.
- `src/lib/connections.ts`: add `findCrossConnectionsSemantic(highlights, vectorsById, { minScore, maxEdges, perNode })` using cosine similarity. Same per-node cap and edge cap logic. Default `minScore` ~0.55 for `text-embedding-3-small` (tunable).
- `src/hooks/useReadwiseData.ts`:
  - After highlights load, call `fetchEmbeddings` once for the full pool (not the filtered view) and cache vectors in `localStorage` keyed by `highlight_id` + `text_hash`.
  - Filtered-view effect uses `findCrossConnectionsSemantic` with the cached vectors. Falls back to Jaccard if embeddings unavailable (offline / function error).
  - Bump `CACHE_KEY` to `v8`.

### 5. UX
- Show a small "Computing connections…" state while the first embedding fetch is in flight (reuse existing `connectionsLoading`).
- Toast on embedding failure: "Using lexical fallback for connections."

### Cost / scale notes
- 500 highlights × ~100 tokens avg ≈ 50k tokens ≈ **$0.001** per full re-embed. Practically free.
- Subsequent loads: zero new embeddings unless highlights change.

### Files
- `supabase/migrations/<new>.sql` — pgvector + table + RLS
- `supabase/functions/embed-highlights/index.ts` — new
- `supabase/config.toml` — add `[functions.embed-highlights]` block with `verify_jwt = false`
- `src/lib/embeddings.ts` — new
- `src/lib/connections.ts` — add semantic variant, keep Jaccard as fallback
- `src/hooks/useReadwiseData.ts` — wire embeddings + caching

### Open question before I build
Confirm the model — I'm proposing `text-embedding-3-small` (1536-dim, $0.02/1M tokens, strong quality, cheap). Alternative is `text-embedding-3-large` (3072-dim, ~6x cost, marginal quality gain at this scale). I'll default to `-small` unless you say otherwise.

Once you approve, I'll request the `OPENAI_API_KEY` secret first, then build.
