// Rose Pine palette — used to color sources in the graph.
// HSL strings so canvas can use them directly.
const ROSE_PINE = [
  "hsl(343, 76%, 68%)", // love
  "hsl(35, 88%, 72%)", // gold
  "hsl(2, 66%, 75%)", // rose
  "hsl(197, 49%, 58%)", // pine (lightened for dark bg)
  "hsl(189, 43%, 73%)", // foam
  "hsl(267, 57%, 78%)", // iris
  "hsl(160, 45%, 65%)",
  "hsl(220, 60%, 75%)",
  "hsl(310, 50%, 75%)",
  "hsl(50, 70%, 70%)",
  "hsl(15, 70%, 70%)",
  "hsl(280, 50%, 75%)",
];

export const CROSS_LINK_COLOR = "hsl(267, 57%, 78%)";

const cache = new Map<number, string>();

export function colorForBook(bookId: number, allBookIds: number[]): string {
  if (cache.has(bookId)) return cache.get(bookId)!;
  const idx = allBookIds.indexOf(bookId);
  const color = ROSE_PINE[idx % ROSE_PINE.length];
  cache.set(bookId, color);
  return color;
}

export function resetColorCache() {
  cache.clear();
}
