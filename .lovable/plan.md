
## Refactor HighlightGraph.tsx

Split the 508-line component into focused modules. No behavior changes — pure structural refactor.

### New files

1. **`src/components/graph/LinkTooltip.tsx`** (~60 lines)
   - The hovered-link tooltip JSX (currently the IIFE at the bottom of the render)
   - Props: `link: GraphLink`, `mousePos: {x,y}`, `width`, `height`
   - Handles its own positioning math

2. **`src/components/graph/drawNode.ts`** (~80 lines)
   - Pure function `drawNode(node, ctx, globalScale, opts)` containing the entire `nodeCanvasObject` body
   - Opts: `{ selectedId, selectedPair, hoveredId, neighbors, labelNodeIds }`
   - Keeps the word-wrapping label logic co-located

3. **`src/components/graph/useGraphFocus.ts`** (~70 lines)
   - Custom hook bundling the three effects:
     - d3-force tuning (charge/link distance)
     - `focusBookId` cluster auto-fit
     - `selectedPair` auto-fit
   - Signature: `useGraphFocus(fgRef, data, { focusBookId, selectedPair, width, height, onFocusHandled })`

4. **`src/components/graph/buildGraphData.ts`** (~90 lines)
   - Pure function `buildGraphData(highlights, connections, { simplified, maxNodes })` returning `{ data: GraphData, neighbors, highlightById }`
   - Houses the big `useMemo` body + neighbor map construction

5. **`src/components/graph/useGraphWheelPan.ts`** (~30 lines)
   - The wheel-pan + mousemove tracking effect, returns `{ wrapperRef, mousePos }`

### Updated file

6. **`src/components/HighlightGraph.tsx`** (~150 lines)
   - Imports the above
   - Keeps: prop interface, `ForceGraph2D` JSX with link styling callbacks (small enough to stay inline), event handlers
   - Becomes mostly orchestration

### Notes

- All exports stay typed against existing `GraphNode`/`GraphLink`/`GraphData` from `src/types/highlight.ts` — no type changes needed.
- Link styling callbacks (`linkWidth`, `linkColor`, `linkLineDash`) stay inline since they close over `selectedPair`/`hoveredLink`/`selectedId` and aren't long enough to justify extraction.
- No new dependencies, no behavior changes, no visual changes.
