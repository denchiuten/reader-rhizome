
## Problem
On mobile portrait, `useIsMobile()` returns true (viewport < 768px) so the graph runs in `simplified` mode with `maxNodes=60`. The current node-trimming picks the 60 highest-degree nodes, which all tend to belong to one dense source — so the user sees a single big cluster from one book. In landscape, viewport ≥ 768px, `isMobile` flips to false, `maxNodes=999`, full graph renders → all clusters visible.

## Fix
Change the mobile node-selection strategy in `HighlightGraph.tsx` so the trimmed set is **representative across all sources**, not dominated by the densest book. Specifically: round-robin across books, picking each book's highest-degree nodes in turn until we hit `maxNodes`. This guarantees every source contributes at least one node (up to the cap), so all clusters appear on mobile portrait too.

Also bump the mobile cap modestly (60 → 90) so small-cluster sources get a couple of nodes each, while keeping perf acceptable.

## Changes

**`src/components/HighlightGraph.tsx`** — replace the current trim block:
```ts
workingHighlights = [...highlights]
  .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
  .slice(0, maxNodes);
```
with a per-book round-robin: group highlights by `book.id`, sort each group by degree desc, then interleave one-from-each-book per pass until `maxNodes` is reached.

**`src/pages/Index.tsx`** — change `maxNodes={isMobile ? 60 : 999}` → `maxNodes={isMobile ? 90 : 999}`.

## Out of scope
- No changes to the `useIsMobile` breakpoint or layout.
- No changes to desktop behavior (still uncapped).
