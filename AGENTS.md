# Architecture rules

- Keep connection summaries and highlight embeddings server-only: browsers request individual results through edge functions, never query the cache tables directly, so the public graph does not expose the full stored history.
- Key embedding cache entries by server-computed model/content hashes and insert without replacing existing entries; caller-provided highlight IDs are response labels only, preventing cache tampering.- Serve highlights from the server-only `readwise_snapshots` copy; refresh it in the background when older than 24h, so visitors never wait on Readwise pagination.
