# Architecture rules

- Keep page-count chart controls in a focused reading chart module and aggregate totals in the pure reading helpers so monthly, yearly, and headline values share the same finish-date rules.

- Serve Reading History at `/` and `/reading`, and the highlight graph at `/graph`; book highlight links target `/graph` so the home page opens the reading dashboard.

- Use the shared AppHeader on both reading and graph pages so primary navigation stays in the same position; keep graph-specific controls below it.

- Keep connection summaries and highlight embeddings server-only: browsers request individual results through edge functions, never query the cache tables directly, so the public graph does not expose the full stored history.
- Key embedding cache entries by server-computed model/content hashes and insert without replacing existing entries; caller-provided highlight IDs are response labels only, preventing cache tampering.- Serve highlights from the server-only `readwise_snapshots` copy; refresh it in the background when older than 24h, so visitors never wait on Readwise pagination.
- Keep `.env` tracked in git: it holds only publishable Cloud keys and the published build needs it (untracking it broke the live site).
- Serve the reading dashboard through server-only reading snapshots with a managed daily authenticated callback; exclude private/deleted books and preserve provider fields rather than inventing genre or progress data.
- Allow manual reading refreshes to await snapshot replacement, with a shared five-minute freshness floor to limit Readwise requests; keep normal loads cached and refetch active other years after refreshing.
- Resolve selected reading-book details from the current shelf by ID rather than storing a book copy, so refreshed shelves cannot retain removed or outdated details.
- Keep reading calculations in a pure module and match Books API records to highlight sources by normalized titles, never by IDs from different APIs.
- Enrich reading genres from batched public ISBN catalog lookups cached per year; leave unmatched subjects unclassified and never send account credentials to the catalog.
