
## Goal
When a cross-source edge is selected (connection view open), dim every node and edge except the two connected highlights and the link between them.

## Approach
The graph already has dimming logic for hover/selected single nodes via `hoverRef` and `selectedId`. Extend it to support a "selected pair".

### 1. New prop on `HighlightGraph.tsx`
Add `selectedPair?: { aId: number; bId: number } | null`.

### 2. Dimming logic
Compute an effective focus set:
- If `selectedPair` is set → focus = `Set([aId, bId])`
- Else if hover or `selectedId` → focus = `Set([focusId])` (existing behavior)
- Else → no dimming

In `nodeCanvasObject`:
- A node is "in focus" if its id is in the focus set, OR (single-focus case only) it's a neighbor of the focus node.
- For pair selection: ONLY the two pair nodes are full opacity; everything else dims to 0.18. Neighbors are NOT highlighted (keeps the visual clean — just the pair).

In `linkColor` / `linkWidth`:
- For pair selection: a link is "in focus" only if both its endpoints are in the pair set (i.e. it's the connecting edge). Bump that edge's width slightly (e.g. 3px) and use full color; everything else fades to the dim color.
- Existing single-focus behavior unchanged.

### 3. Wire from `Index.tsx`
Pass `selectedPair={selection?.kind === "connection" ? { aId: selection.a.id, bId: selection.b.id } : null}`.

Keep `selectedId` as today (null when connection is selected, so no single-node glow).

### 4. Edge cases
- If the two nodes happen to be from the same source, there's also a same-source edge between them — that one will also light up since both endpoints are in the pair. Acceptable.
- Hover still overrides while pair is selected? Decision: pair selection wins — ignore hover dimming while `selectedPair` is set, so the view stays stable. Tooltips on hover still work.

## Files to edit
- `src/components/HighlightGraph.tsx` — add prop, extend dimming in `nodeCanvasObject`, `linkColor`, `linkWidth`.
- `src/pages/Index.tsx` — pass new `selectedPair` prop.

## Out of scope
- No changes to layout, tooltip, or `ConnectionDetail`.
