
Update `src/components/HighlightDetail.tsx` so the "Open in..." link prefers the original article URL for article-type sources.

**Current behavior:** The link uses `highlight.url || readwiseUrl`, where `readwiseUrl` points to the Readwise book review page. `highlight.url` (from Readwise) typically points to the highlight inside Readwise, not the original article.

**Plan:**
1. Use `highlight.book.source_url` as the preferred destination when the category is `articles` (and likely also for `tweets`, `podcasts`, `supplementals`) — i.e. anything that isn't a `books` source where there's no meaningful external URL.
2. Fall back order:
   - If `book.source_url` exists and category ≠ `books` → link to `book.source_url`, label **"Open original article"** (or "Open original" for non-articles).
   - Else if `highlight.url` exists → link to it, label **"Open in Readwise"**.
   - Else → link to the Readwise book review page, label **"Open in Readwise"**.
3. Label adapts to category: "Open original article" for `articles`, "Open original" otherwise.

No other files need to change. `source_url` is already on the `HighlightBook` type and populated by `src/lib/readwise.ts`.
