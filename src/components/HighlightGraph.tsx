import { useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type { CrossConnection, GraphLink, GraphNode, Highlight } from "@/types/highlight";
import { CROSS_LINK_COLOR } from "@/lib/colors";
import { buildGraphData } from "@/components/graph/buildGraphData";
import { drawNode } from "@/components/graph/drawNode";
import { useGraphFocus } from "@/components/graph/useGraphFocus";
import { useGraphWheelPan } from "@/components/graph/useGraphWheelPan";
import { LinkTooltip } from "@/components/graph/LinkTooltip";

interface ConnectionSelection {
  a: Highlight;
  b: Highlight;
  score?: number;
  sharedTerms?: string[];
}

interface Props {
  highlights: Highlight[];
  connections: CrossConnection[];
  onSelect: (h: Highlight | null) => void;
  onSelectConnection?: (conn: ConnectionSelection) => void;
  selectedId: number | null;
  selectedPair?: { aId: number; bId: number } | null;
  width: number;
  height: number;
  simplified?: boolean;
  maxNodes?: number;
  focusBookId?: number | null;
  onFocusHandled?: () => void;
}

export function HighlightGraph({
  highlights,
  connections,
  onSelect,
  onSelectConnection,
  selectedId,
  selectedPair = null,
  width,
  height,
  simplified = false,
  maxNodes = 60,
  focusBookId = null,
  onFocusHandled,
}: Props) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const hoverRef = useRef<number | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);

  const { data, neighbors, highlightById } = useMemo(
    () => buildGraphData(highlights, connections, { simplified, maxNodes }),
    [highlights, connections, simplified, maxNodes],
  );

  useGraphFocus(fgRef, data, { focusBookId, selectedPair, width, height, onFocusHandled });
  const { wrapperRef, mousePos } = useGraphWheelPan(fgRef);

  return (
    <div ref={wrapperRef} style={{ width, height, position: "relative" }}>
      <ForceGraph2D
        ref={fgRef as never}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="hsl(0, 0%, 0%)"
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
        onLinkClick={(link) => {
          const l = link as GraphLink;
          if (l.kind !== "cross-source" || !onSelectConnection) return;
          const sId = typeof l.source === "object" ? l.source.id : l.source;
          const tId = typeof l.target === "object" ? l.target.id : l.target;
          const a = highlightById.get(sId as number);
          const b = highlightById.get(tId as number);
          if (!a || !b) return;
          onSelectConnection({ a, b, score: l.score, sharedTerms: l.sharedTerms });
          if (fgRef.current && typeof l.source === "object" && typeof l.target === "object") {
            const cx = ((l.source.x ?? 0) + (l.target.x ?? 0)) / 2;
            const cy = ((l.source.y ?? 0) + (l.target.y ?? 0)) / 2;
            fgRef.current.centerAt(cx, cy, 600);
            fgRef.current.zoom(2, 600);
          }
        }}
        onLinkHover={(link) => {
          const l = link as GraphLink | null;
          setHoveredLink(l && l.kind === "cross-source" ? l : null);
        }}
        linkWidth={(l) => {
          const link = l as GraphLink;
          const isHovered = hoveredLink === link;
          if (selectedPair) {
            const s = typeof link.source === "object" ? link.source.id : link.source;
            const t = typeof link.target === "object" ? link.target.id : link.target;
            const isPairEdge =
              (s === selectedPair.aId && t === selectedPair.bId) ||
              (s === selectedPair.bId && t === selectedPair.aId);
            if (isPairEdge) return 3;
          }
          if (link.kind === "cross-source") return isHovered ? 3 : 1.5;
          return 0.5;
        }}
        linkColor={(l) => {
          const link = l as GraphLink;
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          if (selectedPair) {
            const isPairEdge =
              (s === selectedPair.aId && t === selectedPair.bId) ||
              (s === selectedPair.bId && t === selectedPair.aId);
            return isPairEdge ? link.color : "hsla(248, 24%, 30%, 0.12)";
          }
          if (hoveredLink === link) return link.color;
          const focus = hoverRef.current ?? selectedId;
          if (focus !== null) {
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
          drawNode(node as unknown as GraphNode, ctx, globalScale, {
            selectedId,
            selectedPair,
            hoveredId: hoverRef.current,
            neighbors,
            labelNodeIds: data.labelNodeIds,
          });
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as unknown as GraphNode;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, Math.max(8, n.val + 4), 0, 2 * Math.PI);
          ctx.fill();
        }}
      />
      {!simplified && hoveredLink && mousePos && (
        <LinkTooltip link={hoveredLink} mousePos={mousePos} width={width} height={height} />
      )}
    </div>
  );
}
