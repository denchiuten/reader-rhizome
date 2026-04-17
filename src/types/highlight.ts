export interface HighlightBook {
  id: number;
  title: string;
  author: string | null;
  category: string | null;
  source_url: string | null;
  cover_image_url: string | null;
  summary: string | null;
}

export interface Highlight {
  id: number;
  text: string;
  note: string | null;
  url: string | null;
  highlighted_at: string | null;
  tags: string[];
  book: HighlightBook;
}

export interface GraphNode {
  id: number;
  highlight: Highlight;
  bookId: number;
  color: string;
  val: number;
  // d3-force will mutate these
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
  kind: "same-source" | "cross-source";
  color: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  labelNodeIds: Set<number>;
}

export interface CrossConnection {
  highlightId: number;
  relatedId: number;
  snippet: string;
}
