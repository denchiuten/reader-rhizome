
## Goal
Show why two highlights are semantically connected when hovering a cross-source edge.

## Current state
- `CrossConnection` already carries a `snippet` field (in `src/types/highlight.ts`), but it's not surfaced anywhere in the UI.
- Cross-source links are rendered in `HighlightGraph.tsx` via `react-force-graph-2d`, which supports per-link hover (`onLinkHover`) and a built-in `linkLabel` (HTML tooltip on hover).

## Approach
Use the library's built-in link hover + a custom floating tooltip so we can render a richer, styled explanation (snippet + the two source titles + similarity context) instead of the plain browser title tooltip.

### 1. Enrich the connection reason
In `src/lib/connections.ts`, when building each `CrossConnection`:
- Keep the existing `snippet` (currently a short text excerpt).
- Also compute and store:
  - `score` (cosine similarity, already calculated — just persist it)
  - `sharedTerms`: top 2–4 overlapping meaningful words between the two highlights (simple tokenize → lowercase → stopword filter → intersect → rank by combined length/frequency). This gives a human-readable "why".
- Update `CrossConnection` type in `src/types/highlight.ts` with optional `score` and `sharedTerms: string[]`.

### 2. Pass reason data onto graph links
In `HighlightGraph.tsx`, when mapping `connections` → `crossLinks`, attach `snippet`, `score`, and `sharedTerms` to each link object. Extend `GraphLink` type to allow these optional fields on cross-source links.

### 3. Hover interaction on edges
In `HighlightGraph.tsx`:
- Add `onLinkHover={(link) => setHoveredLink(link)}` and track hovered link in a ref + state (state needed to trigger tooltip re-render).
- Track mouse position via a `mousemove` listener on the wrapper div (already have `wrapperRef`).
- Slightly thicken + brighten the hovered cross-source link in `linkWidth` / `linkColor` callbacks for affordance.

### 4. Floating tooltip
Render a small absolutely-positioned tooltip inside the wrapper div when a cross-source link is hovered:
- Position near cursor (with viewport edge clamping).
- Content:
  - Header: "Connected idea"
  - Shared terms as small badges (if any)
  - Snippet in italics
  - Two source titles ("From X ↔ Y") in muted text
- Styled with existing Tailwind tokens (`bg-popover`, `text-popover-foreground`, `border`, `shadow-md`, `rounded-md`), matching the rest of the UI.
- `pointer-events-none` so it never blocks the canvas.

### 5. Mobile
Hover doesn't exist on touch. Skip the tooltip on mobile (`simplified` prop is already a good proxy) — no behavior change there.

## Files to edit
- `src/types/highlight.ts` — extend `CrossConnection` and `GraphLink`.
- `src/lib/connections.ts` — compute `score` + `sharedTerms`, attach to each connection.
- `src/components/HighlightGraph.tsx` — link hover state, tooltip rendering, hover styling.

## Out of scope
- No changes to embeddings, thresholds, or the side panel.
- No new dependencies.
