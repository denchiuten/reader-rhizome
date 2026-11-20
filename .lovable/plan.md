# Explore Jev for connection scoring

## Key constraint
Jev scores state against questions (Score / Noul), many questions per request in parallel. But 500 highlights = ~125,000 cross-source pairs. Scoring every pair on every load is far slower and costlier than today's in-browser vector math, so dropping embeddings entirely is unlikely to win. The realistic win is **quality**, not speed: Jev judges whether two ideas genuinely connect, rather than just "sound similar".

## Approach: experiment first, then hybrid
1. **Benchmark spike (no UI change)** — a new backend function `jev-score-pairs` takes a list of highlight pairs and asks Jev one Score question per pair ("How meaningfully do these two ideas connect?", 4 levels: unrelated → same topic only → related idea → strong shared insight/tension). Batch many pairs per request (fan-out). Measure latency, cost and agreement with current cosine scores on ~200 real pairs.
2. **Hybrid if the spike looks good** — embeddings stay as a cheap candidate filter (e.g. top ~1,500 pairs at a lower cosine floor like 0.30); Jev re-scores only those; edges use the Jev score with a threshold. Results cached in a server-only table keyed by highlight content hashes, so each pair is scored once ever.
3. **Pure-Jev option** — only revisit if the spike shows all-pairs is genuinely fast/cheap enough (unlikely at 125k pairs).

```text
highlights ─► embeddings (cached) ─► top-N candidate pairs ─► Jev Score (cached) ─► graph edges
                                   └─ fallback: cosine edges if Jev unavailable
```

## Needed from you
- A TypeSafe API key (stored as a backend secret `TYPESAFE_API_KEY`).

## Technical details
- Function follows existing rules: server-computed content-hash keys, insert-without-replace, cache never readable by browsers, generic errors, per-IP rate limit.
- Client: `useReadwiseData` fetches Jev scores for candidate pairs after embeddings load; falls back to cosine edges on failure. Edge tooltip shows the Jev rating instead of similarity %.
- Check TypeSafe request limits (`/api/errors`) to size batches.
- Step 1 ships only as a benchmark report to you; steps 2+ wait on your go-ahead.
