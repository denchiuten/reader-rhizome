import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { CrossConnection, Highlight } from "@/types/highlight";

interface Props {
  highlight: Highlight;
  allHighlights: Highlight[];
  connections: CrossConnection[];
  onClose: () => void;
  onSelect: (h: Highlight) => void;
}

export function HighlightDetail({
  highlight,
  allHighlights,
  connections,
  onClose,
  onSelect,
}: Props) {
  const related = connections
    .filter((c) => c.highlightId === highlight.id || c.relatedId === highlight.id)
    .map((c) => {
      const otherId = c.highlightId === highlight.id ? c.relatedId : c.highlightId;
      const other = allHighlights.find((h) => h.id === otherId);
      return other ? { highlight: other, snippet: c.snippet } : null;
    })
    .filter((x): x is { highlight: Highlight; snippet: string } => x !== null);

  const sameSource = allHighlights.filter(
    (h) => h.book.id === highlight.book.id && h.id !== highlight.id,
  );

  const readwiseUrl = `https://readwise.io/bookreview/${highlight.book.id}`;

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {highlight.book.category || "Highlight"}
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-foreground">
            {highlight.book.title}
          </h2>
          {highlight.book.author && (
            <p className="text-sm text-muted-foreground">{highlight.book.author}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          <section>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {highlight.text}
            </p>
            {highlight.note && (
              <div className="mt-3 rounded-md border border-accent/30 bg-accent/10 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent">
                  Note
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {highlight.note}
                </p>
              </div>
            )}
            {highlight.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {highlight.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
            <a
              href={highlight.url || readwiseUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open in Readwise <ExternalLink className="h-3 w-3" />
            </a>
          </section>

          {related.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Connected ideas ({related.length})
                </h3>
                <div className="space-y-2">
                  {related.map(({ highlight: r, snippet }) => (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r)}
                      className="block w-full rounded-md border border-border bg-secondary/40 p-3 text-left transition hover:border-primary/50 hover:bg-secondary"
                    >
                      <p className="line-clamp-3 text-sm text-foreground/90">{r.text}</p>
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {r.book.title}
                        {r.book.author ? ` · ${r.book.author}` : ""}
                      </p>
                      {snippet && snippet !== r.text && (
                        <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground/70">
                          ↳ {snippet}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {sameSource.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Other highlights from this source ({sameSource.length})
                </h3>
                <div className="space-y-2">
                  {sameSource.slice(0, 12).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r)}
                      className="block w-full rounded-md p-2 text-left transition hover:bg-secondary/60"
                    >
                      <p className="line-clamp-2 text-sm text-foreground/80">{r.text}</p>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
