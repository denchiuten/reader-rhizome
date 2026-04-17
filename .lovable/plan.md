
## Add tag filtering (document-level)

Filter highlights by the tags on their parent document/book, not per-highlight tags.

### Where document tags come from

Readwise's v2 `/books/` endpoint returns `tags: [{name, id}]` per book. We already fetch all books up front in the edge function — we just need to keep the tags field and filter on it.

### Changes

1. **Edge function** (`supabase/functions/readwise-fetch/index.ts`)
   - Capture `tags` on each book when paginating `/books/` (store as `string[]` on the cached book).
   - Accept `tags?: string[]` in POST body.
   - During the highlight collection loop, a highlight passes if its `book.tags` intersects the selected tag set (OR within tags). Combined with category filter via AND.
   - New mode `{ listTags: true }`: after fetching all books, return `{ tags: string[] }` — the deduped, sorted list of tag names across all books. Cheap because books are already fetched.
   - Include `book.tags` in the returned highlight payload so the UI can show them.

2. **`src/types/highlight.ts`**
   - Add `tags: string[]` to `HighlightBook`.

3. **`src/lib/readwise.ts`**
   - `fetchHighlights(categories?, tags?)` — pass both.
   - New `fetchAvailableTags(): Promise<string[]>`.

4. **`src/hooks/useReadwiseData.ts`**
   - Add `tags: string[]` to state; mirror category pattern.
   - Bump cache prefix to `v6`; cache key includes sorted categories + tags.
   - Expose `setTags(tags)`; `refresh` uses current categories + tags.

5. **New `src/components/TagFilter.tsx`**
   - Popover trigger button labelled "Tags" with a count badge when any are selected.
   - Inside: search input, scrollable checkbox list of available tags, "Clear" button.
   - Loads available tags once on mount via `fetchAvailableTags()`.
   - Disabled while loading.

6. **`src/pages/Index.tsx`**
   - Render `<TagFilter />` next to `<CategoryFilter />` in the header.
   - Wire `tags` / `setTags` from the hook.

### Notes
- Tag matching: OR within selected tags (book has any), AND with category filter.
- Tags shown exact-as-stored (Readwise tags are case-sensitive).
- No schema/db changes; uses existing Popover/Checkbox/Input/Badge components.
