import { useEffect, type MutableRefObject } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import type { GraphData, GraphLink } from "@/types/highlight";

interface Options {
  focusBookId: number | null;
  selectedPair: { aId: number; bId: number } | null;
  width: number;
  height: number;
  onFocusHandled?: () => void;
}

export function useGraphFocus(
  fgRef: MutableRefObject<ForceGraphMethods | undefined>,
  data: GraphData,
  { focusBookId, selectedPair, width, height, onFocusHandled }: Options,
) {
  // d3-force tuning
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force("charge") as unknown as { strength: (n: number) => void } | undefined;
    charge?.strength(-80);
    const link = fg.d3Force("link") as unknown as { distance: (fn: (l: GraphLink) => number) => void } | undefined;
    link?.distance((l: GraphLink) => (l.kind === "cross-source" ? 120 : 30));
  }, [fgRef, data]);

  // Focus on a book's cluster
  useEffect(() => {
    if (focusBookId == null) return;
    const fg = fgRef.current;
    if (!fg) return;
    const clusterNodes = data.nodes.filter(
      (n) => n.bookId === focusBookId && n.x != null && n.y != null,
    );
    if (clusterNodes.length === 0) return;

    const timer = window.setTimeout(() => {
      const xs = clusterNodes.map((n) => n.x!);
      const ys = clusterNodes.map((n) => n.y!);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const padding = 80;
      const spanX = Math.max(60, maxX - minX) + padding;
      const spanY = Math.max(60, maxY - minY) + padding;
      const zoom = Math.min(width / spanX, height / spanY, 4);
      fg.centerAt(cx, cy, 700);
      fg.zoom(Math.max(0.6, zoom), 700);
      onFocusHandled?.();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [fgRef, focusBookId, data.nodes, width, height, onFocusHandled]);

  // Auto-fit a selected connection pair
  useEffect(() => {
    if (!selectedPair) return;
    const fg = fgRef.current;
    if (!fg) return;
    const a = data.nodes.find((n) => n.id === selectedPair.aId);
    const b = data.nodes.find((n) => n.id === selectedPair.bId);
    if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return;

    const timer = window.setTimeout(() => {
      const cx = (a.x! + b.x!) / 2;
      const cy = (a.y! + b.y!) / 2;
      const padding = 160;
      const spanX = Math.max(80, Math.abs(a.x! - b.x!)) + padding;
      const spanY = Math.max(80, Math.abs(a.y! - b.y!)) + padding;
      const zoom = Math.min(width / spanX, height / spanY, 4);
      fg.centerAt(cx, cy, 700);
      fg.zoom(Math.max(0.6, zoom), 700);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [fgRef, selectedPair, data.nodes, width, height]);
}
