import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, FileText, Headphones, Highlighter, Twitter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { CrossConnection, Highlight } from "@/types/highlight";

function CollapsibleSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setExpanded(false);
  }, [summary]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight - el.clientHeight > 1);
  }, [summary]);

  return (
    <div className="rounded-md border border-border bg-secondary/40 p-3">
      <p
        ref={ref}
        className={`whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 ${
          expanded ? "" : "line-clamp-4"
        }`}
      >
        {summary}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

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
  const category = highlight.book.category;
  const sourceUrl = highlight.book.source_url;
  const preferOriginal = !!sourceUrl && category !== "books";
  const linkHref = preferOriginal ? sourceUrl! : highlight.url || readwiseUrl;
  const linkLabel = preferOriginal
    ? category === "articles"
      ? "Open original article"
      : "Open original"
    : "Open in Readwise";

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {highlight.book.cover_image_url && (
            <img
              src={highlight.book.cover_image_url}
              alt=""
              loading="lazy"
              className="h-14 w-10 flex-shrink-0 rounded-sm border border-border object-cover shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {highlight.book.category || "Highlight"}
            </p>
            <h2 className="mt-1 truncate text-base font-semibold text-foreground">
              {highlight.book.title}
            </h2>
            {highlight.book.author && (
              <p className="truncate text-sm text-muted-foreground">{highlight.book.author}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block">
        <div className="w-full space-y-6 p-4">
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
              href={linkHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {linkLabel} <ExternalLink className="h-3 w-3" />
            </a>
          </section>

          {highlight.book.summary && (
            <>
              <Separator />
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Document summary
                </h3>
                <CollapsibleSummary summary={highlight.book.summary} />
              </section>
            </>
          )}

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
