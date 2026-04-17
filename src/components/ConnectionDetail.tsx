import { ExternalLink, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/Markdown";
import { categoryIcon } from "@/lib/categories";
import { useConnectionSummary } from "@/hooks/useConnectionSummary";
import type { Highlight } from "@/types/highlight";

interface Props {
  a: Highlight;
  b: Highlight;
  score?: number;
  sharedTerms?: string[];
  onClose: () => void;
  onSelectHighlight: (h: Highlight) => void;
  hideClose?: boolean;
}

function HighlightCard({
  highlight,
  onOpen,
}: {
  highlight: Highlight;
  onOpen: () => void;
}) {
  const Icon = categoryIcon(highlight.book.category);
  const readwiseUrl = `https://readwise.io/bookreview/${highlight.book.id}`;
  const sourceUrl = highlight.book.source_url;
  const preferOriginal = !!sourceUrl && highlight.book.category !== "books";
  const linkHref = preferOriginal ? sourceUrl! : highlight.url || readwiseUrl;

  return (
    <div className="flex flex-col rounded-md border border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-start gap-2">
        {highlight.book.cover_image_url && (
          <img
            src={highlight.book.cover_image_url}
            alt=""
            loading="lazy"
            className="h-12 w-9 flex-shrink-0 rounded-sm border border-border object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span>{highlight.book.category || "Highlight"}</span>
          </p>
          <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-foreground">
            {highlight.book.title}
          </p>
          {highlight.book.author && (
            <p className="break-words text-xs text-muted-foreground">{highlight.book.author}</p>
          )}
        </div>
      </div>
      <Markdown className="text-sm leading-relaxed text-foreground/90">
        {highlight.text}
      </Markdown>
      {highlight.note && (
        <div className="mt-2 rounded-md border border-accent/30 bg-accent/10 p-2">
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            Note
          </p>
          <Markdown className="text-xs text-foreground/90">{highlight.note}</Markdown>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-medium text-primary hover:underline"
        >
          Open highlight →
        </button>
        <a
          href={linkHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Source <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export function ConnectionDetail({
  a,
  b,
  score,
  sharedTerms,
  onClose,
  onSelectHighlight,
  hideClose = false,
}: Props) {
  const pct = score != null ? Math.round(score * 100) : null;

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Connected idea</span>
            {pct != null && (
              <span className="ml-1 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] tabular-nums text-foreground/80">
                {pct}% similar
              </span>
            )}
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Two highlights, one shared idea
          </h2>
          {sharedTerms && sharedTerms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sharedTerms.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground/80"
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>
        {!hideClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </header>

      <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-3 p-4">
          <HighlightCard highlight={a} onOpen={() => onSelectHighlight(a)} />
          <div className="flex items-center gap-2 px-1">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              connects to
            </span>
            <Separator className="flex-1" />
          </div>
          <HighlightCard highlight={b} onOpen={() => onSelectHighlight(b)} />
        </div>
      </ScrollArea>
    </div>
  );
}
