
## Issue
The Legend panel (`GraphLegend`) is clipped at the right edge of the viewport in some browser configurations (likely when a vertical scrollbar, browser sidebar, or zoom level shifts layout — visible in the user's screenshot where source names like "Apple", "Banks", "Why t..." are cut at the viewport edge mid-text).

## Root cause
`GraphLegend` uses a fixed `w-56` (224px) and is absolutely positioned at `right-3`. There's nothing forcing the inner content to respect the panel width when long source titles + count badges combine, and on narrower-than-expected effective widths the whole panel can sit flush against (or past) the right edge with no breathing room.

## Fix
**`src/components/GraphLegend.tsx`**
1. Replace fixed widths with a responsive max-width pattern: use `max-w-[calc(100vw-1.5rem)]` so the panel always shrinks to fit the viewport, while keeping `w-56` / `w-44` as the preferred width.
2. Add `min-w-0` on the flex row containing the source title so `truncate` actually works inside the flex container.
3. Constrain the collapsible content with `max-h-[calc(100vh-8rem)]` and `overflow-y-auto` on the outer body so a tall source list never pushes the panel off-screen vertically either.
4. Bump `right-3` → `right-2 sm:right-3` and ensure the panel can never exceed available width.

No changes to positioning logic in `Index.tsx`, no changes to data flow.

## Out of scope
- Making the legend draggable or dockable
- Persisting open/closed state across sessions
