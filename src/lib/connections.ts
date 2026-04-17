import type { CrossConnection, Highlight } from "@/types/highlight";

// Common English stopwords to ignore when computing similarity
const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","else","when","at","by","for","with","about","against",
  "between","into","through","during","before","after","above","below","to","from","up","down","in","out",
  "on","off","over","under","again","further","once","here","there","all","any","both","each","few","more",
  "most","other","some","such","no","nor","not","only","own","same","so","than","too","very","can","will",
  "just","don","should","now","is","are","was","were","be","been","being","have","has","had","having","do",
  "does","did","doing","i","me","my","myself","we","our","ours","ourselves","you","your","yours","he","him",
  "his","she","her","hers","it","its","they","them","their","theirs","what","which","who","whom","this",
  "that","these","those","am","of","as","because","while","like","also","one","two","get","got","make","made",
  "really","much","many","way","ways","thing","things","people","time","times","new","old","good","bad",
  "would","could","should","said","says","say","go","goes","going","went","come","comes","came",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}

interface ConnectionOpts {
  minScore?: number;
  maxEdges?: number;
  perNode?: number;
}

function sharedTermsBetween(a: string, b: string, max = 4): string[] {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const shared: string[] = [];
  for (const t of ta) if (tb.has(t)) shared.push(t);
  // Rank by length (longer = more meaningful), then alpha
  shared.sort((x, y) => y.length - x.length || x.localeCompare(y));
  return shared.slice(0, max);
}

function rankAndCap(
  highlights: Highlight[],
  cands: { i: number; j: number; score: number }[],
  maxEdges: number,
  perNode: number,
): CrossConnection[] {
  cands.sort((a, b) => b.score - a.score);
  const degree = new Map<number, number>();
  const result: CrossConnection[] = [];
  for (const c of cands) {
    if (result.length >= maxEdges) break;
    const a = highlights[c.i].id;
    const b = highlights[c.j].id;
    if ((degree.get(a) || 0) >= perNode) continue;
    if ((degree.get(b) || 0) >= perNode) continue;
    const hi = highlights[c.i];
    const hj = highlights[c.j];
    const textA = hi.text + " " + (hi.note || "");
    const textB = hj.text + " " + (hj.note || "");
    result.push({
      highlightId: a,
      relatedId: b,
      snippet: hj.text.slice(0, 160),
      score: c.score,
      sharedTerms: sharedTermsBetween(textA, textB),
    });
    degree.set(a, (degree.get(a) || 0) + 1);
    degree.set(b, (degree.get(b) || 0) + 1);
  }
  return result;
}

export function findCrossConnectionsLocal(
  highlights: Highlight[],
  options: ConnectionOpts = {},
): CrossConnection[] {
  const { minScore = 0.08, maxEdges = 60, perNode = 2 } = options;
  const tokens = highlights.map((h) => tokenize(h.text + " " + (h.note || "")));

  const cands: { i: number; j: number; score: number }[] = [];
  for (let i = 0; i < highlights.length; i++) {
    for (let j = i + 1; j < highlights.length; j++) {
      if (highlights[i].book.id === highlights[j].book.id) continue;
      const score = jaccard(tokens[i], tokens[j]);
      if (score >= minScore) cands.push({ i, j, score });
    }
  }
  return rankAndCap(highlights, cands, maxEdges, perNode);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function findCrossConnectionsSemantic(
  highlights: Highlight[],
  vectors: Map<number, number[]>,
  options: ConnectionOpts = {},
): CrossConnection[] {
  const { minScore = 0.38, maxEdges = 120, perNode = 4 } = options;
  const cands: { i: number; j: number; score: number }[] = [];
  for (let i = 0; i < highlights.length; i++) {
    const va = vectors.get(highlights[i].id);
    if (!va) continue;
    for (let j = i + 1; j < highlights.length; j++) {
      if (highlights[i].book.id === highlights[j].book.id) continue;
      const vb = vectors.get(highlights[j].id);
      if (!vb) continue;
      const score = cosine(va, vb);
      if (score >= minScore) cands.push({ i, j, score });
    }
  }
  return rankAndCap(highlights, cands, maxEdges, perNode);
}
