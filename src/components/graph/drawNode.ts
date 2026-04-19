import type { GraphNode } from "@/types/highlight";

export interface DrawNodeOptions {
  selectedId: number | null;
  selectedPair: { aId: number; bId: number } | null;
  hoveredId: number | null;
  neighbors: Map<number, Set<number>>;
  labelNodeIds: Set<number>;
}

export function drawNode(
  node: GraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  opts: DrawNodeOptions,
) {
  const { selectedId, selectedPair, hoveredId, neighbors, labelNodeIds } = opts;
  const r = node.val;

  let alpha = 1;
  if (selectedPair) {
    const isPair = node.id === selectedPair.aId || node.id === selectedPair.bId;
    alpha = isPair ? 1 : 0.18;
  } else {
    const focus = hoveredId ?? selectedId;
    if (focus !== null && focus !== node.id) {
      const isNeighbor = neighbors.get(focus)?.has(node.id);
      alpha = isNeighbor ? 0.95 : 0.18;
    }
  }
  ctx.globalAlpha = alpha;

  if (node.id === selectedId) {
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = "hsla(343, 76%, 68%, 0.35)";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
  ctx.fillStyle = node.color;
  ctx.fill();
  ctx.strokeStyle = "hsla(245, 50%, 91%, 0.4)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  if (labelNodeIds.has(node.id)) {
    const fontSize = Math.max(11, 13 / globalScale);
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

    const maxLineWidth = 140;
    const maxLines = 3;
    const words = node.highlight.book.title.split(/\s+/);
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
    const totalRendered = lines.join(" ");
    if (totalRendered.length < node.highlight.book.title.length) {
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
    const boxY = node.y! + r + 4;

    ctx.fillStyle = "hsla(0, 0%, 0%, 0.78)";
    ctx.fillRect(node.x! - boxWidth / 2, boxY, boxWidth, boxHeight);
    ctx.fillStyle = "hsla(245, 50%, 91%, 0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillText(line, node.x!, boxY + padY + i * lineHeight);
    });
  }
  ctx.globalAlpha = 1;
}
