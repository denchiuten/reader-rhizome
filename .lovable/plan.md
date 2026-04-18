
## Goal
Show more connection lines by lowering similarity thresholds.

## Changes
**`src/hooks/useReadwiseData.ts`** — relax both semantic and lexical thresholds, allow more edges per node:

- Semantic: `minScore` 0.38 → **0.30**, `maxEdges` 120 → **220**, `perNode` 4 → **7**
- Lexical fallback: `minScore` 0.08 → **0.05**, `maxEdges` 60 → **120**, `perNode` 2 → **4**

Defaults in `src/lib/connections.ts` stay as-is (they're overridden by the hook).

## Why these numbers
- Semantic cosine 0.30 still filters noise but catches thematic siblings the 0.38 cutoff was hiding.
- Raising `perNode` is what actually unlocks visible clusters — the previous cap of 4 was throttling dense hubs even when scores qualified.
- `maxEdges` raised proportionally so the new candidates aren't immediately truncated.

## Risk / out of scope
- Graph may feel busier; if it becomes too noisy we can re-tighten or expose a slider in a follow-up.
- No changes to graph rendering, caching, or AI summary logic.
