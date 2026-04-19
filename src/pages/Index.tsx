import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { HighlightGraph } from "@/components/HighlightGraph";
import { HighlightDetail } from "@/components/HighlightDetail";
import { ConnectionDetail } from "@/components/ConnectionDetail";
import { CategoryFilter } from "@/components/CategoryFilter";
import { TagFilter } from "@/components/TagFilter";
import { GraphLegend } from "@/components/GraphLegend";
import { useReadwiseData } from "@/hooks/useReadwiseData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useElementSize } from "@/hooks/useElementSize";
import type { Highlight } from "@/types/highlight";

type Selection =
  | { kind: "highlight"; highlight: Highlight }
  | { kind: "connection"; a: Highlight; b: Highlight; score?: number; sharedTerms?: string[] }
  | null;

const Index = () => {
  const {
    highlights,
    connections,
    loading,
    connectionsLoading,
    progress,
    error,
    fetchedAt,
    refresh,
    categories,
    setCategories,
    tags,
    setTags,
  } = useReadwiseData();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);
  const [selection, setSelection] = useState<Selection>(null);
  const [focusBookId, setFocusBookId] = useState<number | null>(null);

  const selectedHighlight = selection?.kind === "highlight" ? selection.highlight : null;
  const selectHighlight = (h: Highlight | null) =>
    setSelection(h ? { kind: "highlight", highlight: h } : null);

  // Esc clears any selection / connection view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (selection !== null || focusBookId !== null)) {
        setSelection(null);
        setFocusBookId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, focusBookId]);

  const sourceCount = useMemo(
    () => new Set(highlights.map((h) => h.book.id)).size,
    [highlights],
  );

  const headerStats = (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
      <span>
        <strong className="font-semibold text-foreground">{highlights.length}</strong> highlights
      </span>
      <span>
        <strong className="font-semibold text-foreground">{sourceCount}</strong> sources
      </span>
      <span>
        <strong className="font-semibold text-foreground">{connections.length}</strong> connections
      </span>
      {connectionsLoading && (
        <span className="flex items-center gap-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          finding connections… {progress.done}/{progress.total}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-card/50 px-4 py-3 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Dennis’ Readwise Highlight Graph
            </h1>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="About this site"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-80 text-xs leading-relaxed text-muted-foreground"
              >
                This is Dennis Chiuten’s personal Readwise highlight graph, shared publicly so friends and colleagues can explore the ideas he’s reading. It pulls his 400 most recent highlights and surfaces connections between them.
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Each node is a highlight, coloured by source; lines connect highlights with related ideas. Click a node to read the highlight, or click a line to see how two ideas connect.
          </p>
          <div className="mt-1">{headerStats}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryFilter
              selected={categories}
              onChange={setCategories}
              disabled={loading}
            />
            <TagFilter
              selected={tags}
              onChange={setTags}
              disabled={loading}
            />
          
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading || connectionsLoading}
          className="flex-shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </header>

      <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div ref={containerRef} className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading the latest 400 highlights from Dennis’ Readwise…</p>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6">
              <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Couldn't load highlights</AlertTitle>
                <AlertDescription className="mt-2 text-sm">
                  {error}
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={refresh}>
                      Try again
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : highlights.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No highlights found.
            </div>
          ) : width > 0 && height > 0 ? (
            <>
              <HighlightGraph
                highlights={highlights}
                connections={connections}
                onSelect={selectHighlight}
                onSelectConnection={(c) => setSelection({ kind: "connection", ...c })}
                selectedId={selectedHighlight?.id ?? null}
                selectedPair={
                  selection?.kind === "connection"
                    ? { aId: selection.a.id, bId: selection.b.id }
                    : null
                }
                width={width}
                height={height}
                simplified={isMobile}
                maxNodes={isMobile ? 90 : 999}
                focusBookId={focusBookId}
                onFocusHandled={() => setFocusBookId(null)}
              />
              <GraphLegend
                highlights={highlights}
                onFocusSource={(id) => setFocusBookId(id)}
                defaultOpen={!isMobile}
                compact={isMobile}
              />
            </>
          ) : null}

          {fetchedAt && !loading && (
            <div className="pointer-events-none absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Updated {new Date(fetchedAt).toLocaleTimeString()}
            </div>
          )}

          <footer className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <span>Dennis Chiuten</span>
            <a
              href="https://www.linkedin.com/in/dchiuten/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/denchiuten"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </footer>
        </div>

        {/* Desktop side panel */}
        {!isMobile && selection && (
          <aside className="w-[380px] flex-shrink-0 overflow-hidden border-l border-border">
            {selection.kind === "highlight" ? (
              <HighlightDetail
                highlight={selection.highlight}
                allHighlights={highlights}
                connections={connections}
                onClose={() => setSelection(null)}
                onSelect={selectHighlight}
              />
            ) : (
              <ConnectionDetail
                a={selection.a}
                b={selection.b}
                score={selection.score}
                sharedTerms={selection.sharedTerms}
                onClose={() => setSelection(null)}
                onSelectHighlight={selectHighlight}
              />
            )}
          </aside>
        )}
      </main>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <Sheet open={!!selection} onOpenChange={(open) => !open && setSelection(null)}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            {selection?.kind === "highlight" && (
              <HighlightDetail
                highlight={selection.highlight}
                allHighlights={highlights}
                connections={connections}
                onClose={() => setSelection(null)}
                onSelect={selectHighlight}
                hideClose
              />
            )}
            {selection?.kind === "connection" && (
              <ConnectionDetail
                a={selection.a}
                b={selection.b}
                score={selection.score}
                sharedTerms={selection.sharedTerms}
                onClose={() => setSelection(null)}
                onSelectHighlight={selectHighlight}
                hideClose
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default Index;
