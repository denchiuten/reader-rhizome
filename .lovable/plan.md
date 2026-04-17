
Two small mobile fixes.

## 1. Compact mobile legend

Currently `Index.tsx` hides `<GraphLegend />` entirely on mobile. Change:
- Render the legend on mobile too.
- In `GraphLegend.tsx`, accept the `isMobile` context (or a `defaultOpen` prop) and:
  - Default `open` to `false` on mobile, `true` on desktop.
  - On mobile, shrink the panel: narrower width (`w-44` instead of `w-56`), and when collapsed show just the "Legend" pill — no source list taking space.
  - Keep position `top-3 right-3`.

Simplest approach: pass `defaultOpen={!isMobile}` from `Index.tsx` and add a `compact` prop that tightens width + max-height of the source list (`max-h-32` on mobile vs `max-h-48`).

## 2. Double-X close button on mobile

The screenshot shows two overlapping X icons on the highlight detail close button. Likely cause in `HighlightDetail.tsx`: a custom `<X />` icon is rendered inside a Radix `DialogClose` / `SheetClose` that already injects its own built-in close X. Need to inspect `HighlightDetail.tsx` to confirm which primitive it's using and remove the duplicate — either drop the manual `<X />` or pass the appropriate prop to suppress the built-in one (e.g. `SheetContent` from shadcn renders a default close button; a custom one inside it doubles up).

Fix: keep one close button — prefer the custom one (consistent styling) and either:
- Use a plain `<button>` instead of `SheetClose`/`DialogClose` wrapping, OR
- Override the shadcn `SheetContent` to not render its default close (or use `DialogPrimitive.Content` directly).

I'll confirm exact source once in default mode and apply the minimal change.

## Files
- `src/components/GraphLegend.tsx` — add `defaultOpen` + `compact` props
- `src/pages/Index.tsx` — render legend on mobile with mobile-tuned props
- `src/components/HighlightDetail.tsx` — remove duplicate close X
