
Add a document summary section to the highlight detail panel.

**Investigation:**
- Readwise v2 `/books/` endpoint returns a `summary` field per book (when available, mostly for articles imported via Reader).
- Currently `supabase/functions/readwise-fetch/index.ts` maps only `title`, `author`, `category`, `source_url`, `cover_image_url` into the `book` payload.
- `HighlightBook` type in `src/types/highlight.ts` mirrors that shape.

**Plan:**

1. **Edge function** (`supabase/functions/readwise-fetch/index.ts`):
   - Add `summary: string | null` to the `RWBook` interface.
   - Include `summary: b?.summary ?? null` in the mapped `book` object.

2. **Type** (`src/types/highlight.ts`):
   - Add `summary: string | null` to `HighlightBook`.

3. **Detail panel** (`src/components/HighlightDetail.tsx`):
   - Add a new section between the highlight text/note block and the "Connected ideas" section, only rendered when `highlight.book.summary` is present.
   - Heading: "Document summary" with the summary rendered as muted body text inside a subtle bordered container (matching the existing note/related styling for visual consistency).
   - Wrap with a `<Separator />` like the other sections.

4. **Cache invalidation:**
   - The hook caches under `highlight-graph:cache:v2` in `useReadwiseData.ts`. Bump to `v3` so existing users without the `summary` field get a fresh fetch automatically.

No schema changes; no new dependencies.
