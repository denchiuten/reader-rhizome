import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HighlightGraph } from "@/components/HighlightGraph";
import { HighlightDetail } from "@/components/HighlightDetail";
import { useReadwiseData } from "@/hooks/useReadwiseData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useElementSize } from "@/hooks/useElementSize";
import type { Highlight } from "@/types/highlight";

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
  } = useReadwiseData();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);
  const [selected, setSelected] = useState<Highlight | null>(null);

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
          <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Highlight Graph
          </h1>
          {headerStats}
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

      <main className="flex min-h-0 flex-1">
        <div ref={containerRef} className="relative min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Pulling your latest 200 highlights from Readwise…</p>
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
            <HighlightGraph
              highlights={highlights}
              connections={connections}
              onSelect={setSelected}
              selectedId={selected?.id ?? null}
              width={width}
              height={height}
              simplified={isMobile}
              maxNodes={isMobile ? 60 : 999}
            />
          ) : null}

          {fetchedAt && !loading && (
            <div className="pointer-events-none absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Updated {new Date(fetchedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Desktop side panel */}
        {!isMobile && selected && (
          <aside className="w-[380px] flex-shrink-0 border-l border-border">
            <HighlightDetail
              highlight={selected}
              allHighlights={highlights}
              connections={connections}
              onClose={() => setSelected(null)}
              onSelect={setSelected}
            />
          </aside>
        )}
      </main>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            {selected && (
              <HighlightDetail
                highlight={selected}
                allHighlights={highlights}
                connections={connections}
                onClose={() => setSelected(null)}
                onSelect={setSelected}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default Index;
