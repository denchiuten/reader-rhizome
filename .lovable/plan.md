
## Goal
When the user clicks a cross-source (dashed) edge in the graph, open the side panel showing **both** connected highlights side-by-side, instead of just one.

## Current state
- `HighlightGraph.tsx` exposes `onSelect: (h: Highlight | null) => void` — single highlight only.
- `Index.tsx` owns `selectedHighlight` state and renders `<HighlightDetail highlight={selectedHighlight} ... />` in the side panel.
- `HighlightDetail.tsx` renders one highlight.
- Cross-source links already carry `snippet`, `score`, `sharedTerms`, `sourceTitle`, `targetTitle` (added in the previous step). We also need access to the underlying source/target highlight ids → can be read from `link.source` / `link.target` (already nodes after force layout).
- `react-force-graph-2d` supports `onLinkClick`.

## Approach

### 1. New selection model
Change the side-panel selection to support either:
- a single highlight (existing flow — node click), OR
- a connection (two highlights + score + sharedTerms — new flow)

Introduce in `Index.tsx`:
```ts
type Selection =
  | { kind: "highlight"; highlight: Highlight }
  | { kind: "connection"; a: Highlight; b: Highlight; score?: number; sharedTerms?: string[] }
  | null;
```

### 2. Wire edge clicks in `HighlightGraph.tsx`
- Add a new prop `onSelectConnection?: (conn: { a: Highlight; b: Highlight; score?: number; sharedTerms?: string[] }) => void`.
- Build a `highlightById` map (already have `titleById`; extend to a full Highlight map).
- Add `onLinkClick={(link) => { ... }}`:
  - Only handle `kind === "cross-source"`.
  - Resolve source/target ids → look up Highlight objects.
  - Call `onSelectConnection` with both highlights + the link's `score` and `sharedTerms`.
  - Optionally `centerAt` the midpoint between the two nodes and zoom slightly.
- Increase the link pointer area for cross-source edges so they're easier to click — add `linkPointerAreaPaint` that draws a thicker invisible band along cross-source links (skip for same-source to keep node clicks priority).

  Actually simpler: rely on the library's default link hit-detection. Cross-source edges are dashed and 1.5–3px wide; the library's default tolerance (~4px) is workable. If clicks feel finicky we can add `linkPointerAreaPaint` later. For first pass, skip the custom paint.

### 3. Side panel rendering in `Index.tsx`
- Replace `selectedHighlight` state with the new `Selection` union.
- Pass:
  - `selectedId` to graph: derive as `selection?.kind === "highlight" ? selection.highlight.id : null` (keeps the node glow behavior unchanged for single-highlight selection; connection selection won't glow a single node — that's fine).
  - `onSelect` for node clicks: wraps into `{ kind: "highlight", highlight }`.
  - New `onSelectConnection` for edge clicks: wraps into `{ kind: "connection", ... }`.
- In the side panel:
  - If `selection.kind === "highlight"` → render `<HighlightDetail highlight={selection.highlight} ... />` as today.
  - If `selection.kind === "connection"` → render a new `<ConnectionDetail ... />` component.

### 4. New component: `src/components/ConnectionDetail.tsx`
Layout (responsive):
- Header:
  - Small "Connected idea" eyebrow label
  - Right side: similarity % badge if score available
- Shared terms as small badges (reuse the same chip style from the hover tooltip for consistency)
- Two highlights side-by-side on `md+`, stacked on smaller screens. The side panel in `Index.tsx` is wide enough on desktop (need to confirm — currently it's an aside on the right; will use `grid grid-cols-1 md:grid-cols-2 gap-4` and let it stack if narrow).
- Each side renders a compact card:
  - Book title (linked if `source_url`)
  - Author (muted)
  - Highlight text (with quotes / italic styling matching `HighlightDetail`)
  - Optional note (if present)
  - "Open highlight" button → switches selection to `{ kind: "highlight", highlight }` so the user can drill into a single one
- Close button (X) at top-right matching `HighlightDetail`'s close affordance — reuse same `onClose` pattern.

Design: use existing tokens (`bg-card`, `border`, `text-foreground`, `text-muted-foreground`, `bg-muted/40`, `rounded-md`). No new colors. Match `HighlightDetail`'s typography choices for visual cohesion.

### 5. Mobile
- The side panel already adapts to mobile (it's a sheet/drawer on small screens, based on prior structure). Need to verify in `Index.tsx`. The two-column layout collapses to one column via Tailwind responsive classes — no extra logic needed.

## Files to edit
- `src/pages/Index.tsx` — replace `selectedHighlight` with `Selection` union; route node vs edge selection; render `ConnectionDetail` or `HighlightDetail`.
- `src/components/HighlightGraph.tsx` — add `onSelectConnection` prop and `onLinkClick` handler that resolves both highlights from the link.
- `src/components/ConnectionDetail.tsx` — new component for the dual-highlight view.

## Out of scope
- No changes to embeddings, tooltip, or graph layout.
- No new dependencies.
- Not changing the existing `HighlightDetail` component (only how it's invoked).
- Not adding URL routing for selections.

## Validation
- Click a node → side panel shows that single highlight (existing behavior unchanged).
- Click a dashed cross-source edge → side panel shows both connected highlights side-by-side, with shared terms and similarity %.
- Click a same-source edge → nothing happens (or just clears, matching background-click behavior).
- Click "Open highlight" inside a connection card → side panel switches to that single highlight.
- Close button clears selection.
- Mobile: two cards stack vertically, layout remains readable.
