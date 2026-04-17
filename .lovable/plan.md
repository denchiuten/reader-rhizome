
Add a category filter bar that re-fetches highlights filtered by selected categories.

**Approach:** Readwise's `/highlights/` endpoint doesn't natively filter by category — category lives on books. So filtering requires fetching highlights, then keeping pulling pages until we have 200 highlights whose book.category is in the selected set (with a safety cap on pages).

**Changes:**

1. **Edge function** (`supabase/functions/readwise-fetch/index.ts`):
   - Accept POST body `{ categories?: string[] }`. Empty/undefined → no filter (current behavior).
   - Fetch highlights page by page, building up a book cache, filtering each page's highlights by `book.category ∈ categories` until we hit 200 or exhaust ~10 pages (safety cap).
   - To avoid N book lookups, lazily fetch books needed: collect book_ids per page, fetch missing ones via the existing books-list pagination strategy (kept as-is) but only after we've gathered candidate highlights.
   - Simpler: keep existing book-fetching logic, but loop highlights pages 1..N (cap 10), filter post-hoc.

2. **`src/lib/readwise.ts`**:
   - `fetchHighlights(categories?: string[])` passes them to the edge function body.

3. **`src/hooks/useReadwiseData.ts`**:
   - Track `categories: string[]` in state. Cache key includes a stable hash of selected categories so each filter combo caches independently.
   - Expose `setCategories(cats: string[])` which triggers a fresh load (force=true, bypassing cache, but still writing to a cache entry keyed by that filter).
   - On change, immediately load.

4. **New component** `src/components/CategoryFilter.tsx`:
   - Fixed list of toggleable categories: `books`, `articles`, `tweets`, `podcasts`, `supplementals`. Use the same icons from `HighlightDetail`. Lucide icons reused via a small `categoryIcon()` helper extracted to a shared `src/lib/categories.ts` (icon + label map).
   - Toggle buttons styled as small pill `Toggle` components (use existing `@/components/ui/toggle`). Empty selection = "All".
   - Disabled while loading.

5. **`src/pages/Index.tsx`**:
   - Render `<CategoryFilter selected={categories} onChange={setCategories} disabled={loading || connectionsLoading} />` in the header, beneath the stats line (or aligned right of stats on desktop).
   - Wire up the new hook returns.

6. **Refactor:** Move category icon mapping into `src/lib/categories.ts` so HighlightDetail and CategoryFilter share one source of truth (avoids duplication — addresses the "perfect architecture" guideline).

No schema/database changes; no new dependencies (lucide + existing toggle component cover it).
