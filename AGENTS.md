# Architecture rules

- Keep connection summaries and highlight embeddings server-only: browsers request individual results through edge functions, never query the cache tables directly, so the public graph does not expose the full stored history.