import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { colorForBook, CROSS_LINK_COLOR } from "@/lib/colors";
import type { Highlight } from "@/types/highlight";

interface Props {
  highlights: Highlight[];
  onFocusSource?: (bookId: number) => void;
  defaultOpen?: boolean;
  compact?: boolean;
}

export function GraphLegend({
  highlights,
  onFocusSource,
  defaultOpen = true,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const sources = useMemo(() => {
    const seen = new Map<
      number,
      { id: number; title: string; count: number; url: string | null }
    >();
    for (const h of highlights) {
      const existing = seen.get(h.book.id);
      if (existing) existing.count += 1;
      else
        seen.set(h.book.id, {
          id: h.book.id,
          title: h.book.title || "Unknown",
          count: 1,
          url: h.book.source_url,
        });
    }
    const allIds = Array.from(seen.keys());
    return Array.from(seen.values())
      .sort((a, b) => b.count - a.count)
      .map((s) => ({ ...s, color: colorForBook(s.id, allIds) }));
  }, [highlights]);

  return (
    <div className={`pointer-events-auto absolute top-3 right-2 sm:right-3 ${compact ? "w-44" : "w-56"} max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] rounded-md border border-border bg-card/85 text-xs shadow-sm backdrop-blur`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span>Legend</span>
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-2.5 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Edges
          </div>
          <ul className="mb-3 space-y-1.5">
            <li className="flex items-center gap-2">
              <svg width="28" height="6" className="flex-shrink-0">
                <line
                  x1="0"
                  y1="3"
                  x2="28"
                  y2="3"
                  stroke="hsl(248, 24%, 55%)"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-foreground/80">Same source</span>
            </li>
            <li className="flex items-center gap-2">
              <svg width="28" height="6" className="flex-shrink-0">
                <line
                  x1="0"
                  y1="3"
                  x2="28"
                  y2="3"
                  stroke={CROSS_LINK_COLOR}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              </svg>
              <span className="text-foreground/80">Cross source (related idea)</span>
            </li>
          </ul>

          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Sources ({sources.length})
          </div>
          <ul className={`${compact ? "max-h-32" : "max-h-48"} space-y-1 overflow-y-auto pr-1`}>
            {sources.map((s) => {
              const content = (
                <>
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate text-foreground/80" title={s.title}>
                    {s.title}
                  </span>
                  <span className="ml-auto flex-shrink-0 text-[10px] text-muted-foreground/70">
                    {s.count}
                  </span>
                </>
              );
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onFocusSource?.(s.id)}
                    className="-mx-1 flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left hover:bg-accent hover:text-foreground"
                    title={s.url ? `Focus cluster · ${s.title}` : `Focus cluster · ${s.title}`}
                  >
                    {content}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
