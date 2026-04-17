import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type { CrossConnection, GraphData, GraphLink, GraphNode, Highlight } from "@/types/highlight";
import { CROSS_LINK_COLOR, colorForBook } from "@/lib/colors";

interface Props {
  highlights: Highlight[];
  connections: CrossConnection[];
  onSelect: (h: Highlight | null) => void;
  selectedId: number | null;
  width: number;
  height: number;
  simplified?: boolean;
  maxNodes?: number;
}

export function HighlightGraph({
  highlights,
  connections,
  onSelect,
  selectedId,
  width,
  height,
  simplified = false,
  maxNodes = 60,
}: Props) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const hoverRef = useRef<number | null>(null);

  const data: GraphData = useMemo(() => {
    const allBookIds = Array.from(new Set(highlights.map((h) => h.book.id)));

    // Build same-source edges
    const bySource = new Map<number, Highlight[]>();
    for (const h of highlights) {
      if (!bySource.has(h.book.id)) bySource.set(h.book.id, []);
      bySource.get(h.book.id)!.push(h);
    }

    const sameLinks: GraphLink[] = [];
    for (const [bookId, hs] of bySource) {
      const color = colorForBook(bookId, allBookIds);
      for (let i = 0; i < hs.length; i++) {
        for (let j = i + 1; j < hs.length; j++) {
          sameLinks.push({
            source: hs[i].id,
            target: hs[j].id,
            kind: "same-source",
            color,
          });
        }
      }
    }

    const crossLinks: GraphLink[] = connections.map((c) => ({
      source: c.highlightId,
      target: c.relatedId,
      kind: "cross-source",
      color: CROSS_LINK_COLOR,
    }));

    // Connection counts for sizing & filtering
    const degree = new Map<number, number>();
    for (const l of [...sameLinks, ...crossLinks]) {
      degree.set(l.source as number, (degree.get(l.source as number) || 0) + 1);
      degree.set(l.target as number, (degree.get(l.target as number) || 0) + 1);
    }

    let workingHighlights = highlights;
    if (simplified && highlights.length > maxNodes) {
      workingHighlights = [...highlights]
        .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
        .slice(0, maxNodes);
    }
    const nodeIds = new Set(workingHighlights.map((h) => h.id));

    const nodes: GraphNode[] = workingHighlights.map((h) => ({
      id: h.id,
      highlight: h,
      bookId: h.book.id,
      color: colorForBook(h.book.id, allBookIds),
      val: 1 + Math.min(8, (degree.get(h.id) || 0) * 0.3),
    }));

    const links = [...sameLinks, ...crossLinks].filter(
      (l) => nodeIds.has(l.source as number) && nodeIds.has(l.target as number),
    );

    // Pick one "label node" per book — the highest-degree node in that cluster
    const labelNodeIds = new Set<number>();
    const byBook = new Map<number, GraphNode[]>();
    for (const n of nodes) {
      if (!byBook.has(n.bookId)) byBook.set(n.bookId, []);
      byBook.get(n.bookId)!.push(n);
    }
    for (const [, ns] of byBook) {
      const winner = ns.reduce((best, n) =>
        (degree.get(n.id) || 0) > (degree.get(best.id) || 0) ? n : best,
      );
      labelNodeIds.add(winner.id);
    }

    return { nodes, links, labelNodeIds };
  }, [highlights, connections, simplified, maxNodes]);

  // Build neighbor map for hover dimming
  const neighbors = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const l of data.links) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    }
    return m;
  }, [data.links]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    // Slightly stronger repulsion for readability
    const charge = fg.d3Force("charge") as unknown as { strength: (n: number) => void } | undefined;
    charge?.strength(-80);
    const link = fg.d3Force("link") as unknown as { distance: (fn: (l: GraphLink) => number) => void } | undefined;
    link?.distance((l: GraphLink) => (l.kind === "cross-source" ? 120 : 30));
  }, [data]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Two-finger trackpad scroll pans; pinch (ctrlKey wheel) keeps zoom.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      const fg = fgRef.current;
      if (!fg) return;
      // ctrlKey wheel = pinch-to-zoom on trackpads → let the library handle it
      if (e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const currentZoom = fg.zoom();
      const dx = e.deltaX / currentZoom;
      const dy = e.deltaY / currentZoom;
      const center = fg.centerAt();
      fg.centerAt((center.x ?? 0) + dx, (center.y ?? 0) + dy, 0);
    };

    // Capture phase on the wrapper intercepts before the canvas's own listener fires
    wrapper.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => wrapper.removeEventListener("wheel", handleWheel, true);
  }, []);

  return (
    <div ref={wrapperRef} style={{ width, height, position: "relative" }}>
    <ForceGraph2D
      ref={fgRef as never}
      graphData={data}
      width={width}
      height={height}
      backgroundColor="hsl(249, 22%, 12%)"
      nodeRelSize={4}
      cooldownTicks={120}
      enableNodeDrag={!simplified}
      onNodeClick={(node) => {
        const n = node as unknown as GraphNode;
        onSelect(n.highlight);
        if (fgRef.current) {
          fgRef.current.centerAt(n.x ?? 0, n.y ?? 0, 600);
          fgRef.current.zoom(2.5, 600);
        }
      }}
      onNodeHover={(node) => {
        hoverRef.current = node ? (node as unknown as GraphNode).id : null;
      }}
      onBackgroundClick={() => onSelect(null)}
      linkWidth={(l) => ((l as GraphLink).kind === "cross-source" ? 1.5 : 0.5)}
      linkColor={(l) => {
        const link = l as GraphLink;
        const hover = hoverRef.current;
        const sel = selectedId;
        const focus = hover ?? sel;
        if (focus !== null) {
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          const involved = s === focus || t === focus;
          return involved ? link.color : "hsla(248, 24%, 30%, 0.15)";
        }
        return link.kind === "cross-source" ? "hsla(267, 57%, 78%, 0.55)" : link.color + "55";
      }}
      linkLineDash={(l) => ((l as GraphLink).kind === "cross-source" ? [4, 3] : null)}
      linkDirectionalParticles={(l) => ((l as GraphLink).kind === "cross-source" ? 2 : 0)}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleColor={() => CROSS_LINK_COLOR}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const n = node as unknown as GraphNode;
        const r = n.val;
        const hover = hoverRef.current;
        const focus = hover ?? selectedId;
        let alpha = 1;
        if (focus !== null && focus !== n.id) {
          const isNeighbor = neighbors.get(focus)?.has(n.id);
          alpha = isNeighbor ? 0.95 : 0.18;
        }
        ctx.globalAlpha = alpha;

        // Glow for selected
        if (n.id === selectedId) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r + 4, 0, 2 * Math.PI);
          ctx.fillStyle = "hsla(343, 76%, 68%, 0.35)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.strokeStyle = "hsla(245, 50%, 91%, 0.4)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // One label per cluster: only the chosen "label node" for each book gets the title.
        // Always show on hover/selection regardless.
        const isLabelNode = data.labelNodeIds.has(n.id);
        const isFocused = hover === n.id || selectedId === n.id;
        if (isLabelNode || isFocused) {
          const fontSize = Math.max(11, 13 / globalScale);
          ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

          // Word-wrap the title to a max width, up to 3 lines
          const maxLineWidth = 140; // px in graph space
          const maxLines = 3;
          const words = n.highlight.book.title.split(/\s+/);
          const lines: string[] = [];
          let current = "";
          for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (ctx.measureText(test).width <= maxLineWidth || !current) {
              current = test;
            } else {
              lines.push(current);
              current = word;
              if (lines.length === maxLines - 1) break;
            }
          }
          if (current && lines.length < maxLines) lines.push(current);
          // If we broke early and there's leftover, ellipsize the last line
          const totalRendered = lines.join(" ");
          if (totalRendered.length < n.highlight.book.title.length) {
            const last = lines[lines.length - 1];
            let truncated = last;
            while (ctx.measureText(truncated + "…").width > maxLineWidth && truncated.length > 1) {
              truncated = truncated.slice(0, -1);
            }
            lines[lines.length - 1] = truncated + "…";
          }

          const lineHeight = fontSize + 2;
          const padX = 4;
          const padY = 2;
          const boxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
          const boxHeight = lineHeight * lines.length + padY * 2;
          const boxY = n.y! + r + 4;

          ctx.fillStyle = "hsla(249, 22%, 12%, 0.78)";
          ctx.fillRect(n.x! - boxWidth / 2, boxY, boxWidth, boxHeight);
          ctx.fillStyle = "hsla(245, 50%, 91%, 0.95)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          lines.forEach((line, i) => {
            ctx.fillText(line, n.x!, boxY + padY + i * lineHeight);
          });
        }
        ctx.globalAlpha = 1;
      }}
      nodePointerAreaPaint={(node, color, ctx) => {
        const n = node as unknown as GraphNode;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, n.val + 2, 0, 2 * Math.PI);
        ctx.fill();
      }}
    />
    </div>
  );
}
