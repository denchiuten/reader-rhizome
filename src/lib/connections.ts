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

export function findCrossConnectionsLocal(
  highlights: Highlight[],
  options: { minScore?: number; maxEdges?: number; perNode?: number } = {},
): CrossConnection[] {
  const { minScore = 0.08, maxEdges = 60, perNode = 2 } = options;
  const tokens = highlights.map((h) => tokenize(h.text + " " + (h.note || "")));

  type Cand = { i: number; j: number; score: number };
  const cands: Cand[] = [];

  for (let i = 0; i < highlights.length; i++) {
    for (let j = i + 1; j < highlights.length; j++) {
      // Only cross-source
      if (highlights[i].book.id === highlights[j].book.id) continue;
      const score = jaccard(tokens[i], tokens[j]);
      if (score >= minScore) cands.push({ i, j, score });
    }
  }

  cands.sort((a, b) => b.score - a.score);

  // Cap per-node to avoid hub explosion
  const degree = new Map<number, number>();
  const result: CrossConnection[] = [];
  for (const c of cands) {
    if (result.length >= maxEdges) break;
    const a = highlights[c.i].id;
    const b = highlights[c.j].id;
    if ((degree.get(a) || 0) >= perNode) continue;
    if ((degree.get(b) || 0) >= perNode) continue;
    result.push({
      highlightId: a,
      relatedId: b,
      snippet: highlights[c.j].text.slice(0, 160),
    });
    degree.set(a, (degree.get(a) || 0) + 1);
    degree.set(b, (degree.get(b) || 0) + 1);
  }
  return result;
}
