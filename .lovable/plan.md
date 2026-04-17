

## Move filtering client-side, fetch a larger pool

Stop re-fetching from Readwise when filters change. Fetch one pool of ~500 recent highlights, cache it, then filter locally and cap the displayed graph at 200.

### Why this fixes the 429s

Today every category/tag toggle hits the edge function, which paginates `/highlights/` (up to 10 pages). Readwise's per-minute limit trips fast. With one fetch and local filtering, toggles cost zero network.

### Changes

1. **Edge function** (`supabase/functions/readwise-fetch/index.ts`)
   - Drop `categories` / `tags` request params and the server-side filter loop.
   - Raise `TARGET` to 500; keep page-size 100 and the existing 250 ms inter-page spacing + retry.
   - Keep `listTags` mode (still useful: returns the full library tag set, not just tags present in the 500).
   - Always return up to 500 highlights with their `book.tags` attached (already in payload).

2. **`src/lib/readwise.ts`**
   - `fetchHighlights()` — no args. Returns the 500-pool.
   - Keep `fetchAvailableTags()` as-is.

3. **`src/hooks/useReadwiseData.ts`** — biggest change
   - Cache the **unfiltered pool** only. Cache key: `highlight-graph:cache:v7` (no filter suffix).
   - State adds `allHighlights: Highlight[]`. `highlights` becomes the filtered+capped view (max 200).
   - Filter logic (pure, runs synchronously on every filter change):
     ```
     const DISPLAY_CAP = 200;
     const filtered = allHighlights
       .filter(h => cats.length === 0 || (h.book.category && cats.includes(h.book.category)))
       .filter(h => tags.length === 0 || h.book.tags.some(t => tags.includes(t)))  // OR
       .slice(0, DISPLAY_CAP);
     ```
   - Recompute connections from the filtered set (cheap, already local).
   - `setCategories` / `setTags` no longer trigger network — just recompute. Drop the debounce.
   - `refresh()` re-fetches the pool, then re-filters.

4. **Tag filter answer (OR confirmed)**
   - Already OR in spec; the new local filter uses `.some(...)`, which is OR. Document this in a comment so it doesn't drift.

5. **Graceful failure**
   - If the pool fetch fails but a cached pool exists, keep showing it and surface a non-blocking toast ("Couldn't refresh — showing cached highlights"). Prevents the blank "Couldn't load highlights" screen the user just hit.

6. **TagFilter / CategoryFilter / Index.tsx**
   - No prop changes. Filters now feel instant (no spinner on toggle).
   - Remove the `disabled` prop wiring tied to `loading` for filter controls once the pool is loaded.

### Trade-offs (worth flagging)

- Filters operate on the **most recent 500** highlights, not your entire library. For older items, you'd need a "Load more" / different strategy later.
- The TagFilter dropdown still lists **all** library tags (via `listTags`), so a user can pick a tag with zero matches in the current 500 — UI will just show an empty graph. Acceptable; can add a "(0)" hint later.

### Tech notes

- `v7` cache prefix invalidates old per-filter cache entries cleanly.
- Connection computation already runs on whatever array we pass it, no API change.
- One edge function call on first load (cold or after 6h TTL); zero on every filter interaction.

