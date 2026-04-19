import type { GraphLink } from "@/types/highlight";

interface Props {
  link: GraphLink;
  mousePos: { x: number; y: number };
  width: number;
  height: number;
}

export function LinkTooltip({ link, mousePos, width, height }: Props) {
  const tooltipWidth = 280;
  const tooltipMaxHeight = 200;
  const offset = 14;
  let left = mousePos.x + offset;
  let top = mousePos.y + offset;
  if (left + tooltipWidth > width) left = mousePos.x - tooltipWidth - offset;
  if (top + tooltipMaxHeight > height) top = mousePos.y - tooltipMaxHeight - offset;
  left = Math.max(8, left);
  top = Math.max(8, top);
  const pct = link.score != null ? Math.round(link.score * 100) : null;

  return (
    <div
      className="pointer-events-none absolute z-50 rounded-md border bg-popover text-popover-foreground shadow-md p-3 text-xs animate-in fade-in-0 zoom-in-95"
      style={{ left, top, width: tooltipWidth }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
          Connected idea
        </span>
        {pct != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {pct}% similar
          </span>
        )}
      </div>
      {link.sharedTerms && link.sharedTerms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {link.sharedTerms.map((term) => (
            <span
              key={term}
              className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground/80"
            >
              {term}
            </span>
          ))}
        </div>
      )}
      {link.snippet && (
        <p className="italic text-foreground/90 leading-snug line-clamp-4 mb-2">
          "{link.snippet}"
        </p>
      )}
      {(link.sourceTitle || link.targetTitle) && (
        <p className="text-[10px] text-muted-foreground truncate">
          {link.sourceTitle ?? "?"} ↔ {link.targetTitle ?? "?"}
        </p>
      )}
    </div>
  );
}
