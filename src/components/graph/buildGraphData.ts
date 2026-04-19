import type { CrossConnection, GraphData, GraphLink, GraphNode, Highlight } from "@/types/highlight";
import { CROSS_LINK_COLOR, colorForBook } from "@/lib/colors";

export interface BuildGraphResult {
  data: GraphData;
  neighbors: Map<number, Set<number>>;
  highlightById: Map<number, Highlight>;
  titleById: Map<number, string>;
}

export function buildGraphData(
  highlights: Highlight[],
  connections: CrossConnection[],
  opts: { simplified: boolean; maxNodes: number },
): BuildGraphResult {
  const { simplified, maxNodes } = opts;

  const titleById = new Map<number, string>();
  const highlightById = new Map<number, Highlight>();
  for (const h of highlights) {
    titleById.set(h.id, h.book.title);
    highlightById.set(h.id, h);
  }

  const allBookIds = Array.from(new Set(highlights.map((h) => h.book.id)));

  // Same-source edges
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
    snippet: c.snippet,
    score: c.score,
    sharedTerms: c.sharedTerms,
    sourceTitle: titleById.get(c.highlightId),
    targetTitle: titleById.get(c.relatedId),
  }));

  const degree = new Map<number, number>();
  for (const l of [...sameLinks, ...crossLinks]) {
    degree.set(l.source as number, (degree.get(l.source as number) || 0) + 1);
    degree.set(l.target as number, (degree.get(l.target as number) || 0) + 1);
  }

  let workingHighlights = highlights;
  if (simplified && highlights.length > maxNodes) {
    const groups = new Map<number, Highlight[]>();
    for (const h of highlights) {
      if (!groups.has(h.book.id)) groups.set(h.book.id, []);
      groups.get(h.book.id)!.push(h);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0));
    }
    const bookOrder = Array.from(groups.keys());
    const picked: Highlight[] = [];
    let pass = 0;
    while (picked.length < maxNodes) {
      let addedThisPass = false;
      for (const bId of bookOrder) {
        const arr = groups.get(bId)!;
        if (pass < arr.length) {
          picked.push(arr[pass]);
          addedThisPass = true;
          if (picked.length >= maxNodes) break;
        }
      }
      if (!addedThisPass) break;
      pass++;
    }
    workingHighlights = picked;
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

  // Neighbor map for hover dimming
  const neighbors = new Map<number, Set<number>>();
  for (const l of links) {
    const s = l.source as number;
    const t = l.target as number;
    if (!neighbors.has(s)) neighbors.set(s, new Set());
    if (!neighbors.has(t)) neighbors.set(t, new Set());
    neighbors.get(s)!.add(t);
    neighbors.get(t)!.add(s);
  }

  return {
    data: { nodes, links, labelNodeIds },
    neighbors,
    highlightById,
    titleById,
  };
}
