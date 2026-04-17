import { supabase } from "@/integrations/supabase/client";
import type { Highlight, CrossConnection } from "@/types/highlight";

export async function fetchHighlights(): Promise<Highlight[]> {
  const { data, error } = await supabase.functions.invoke("readwise-fetch", {
    body: {},
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data.highlights as Highlight[];
}

export async function searchSimilar(
  query: string,
  excludeBookId: number,
  limit = 3,
): Promise<{ id: number; text: string; book_id: number }[]> {
  const { data, error } = await supabase.functions.invoke("readwise-search", {
    body: { query: query.slice(0, 400), excludeBookId, limit },
  });
  if (error) throw new Error(error.message);
  if (data?.error) return [];
  return data.results || [];
}

export async function findCrossConnections(
  highlights: Highlight[],
  onProgress: (done: number, total: number) => void,
  maxEdges = 40,
): Promise<CrossConnection[]> {
  const knownIds = new Set(highlights.map((h) => h.id));
  const seen = new Set<string>();
  const connections: CrossConnection[] = [];

  // Process in batches of 4 concurrent requests
  const batchSize = 4;
  for (let i = 0; i < highlights.length; i += batchSize) {
    if (connections.length >= maxEdges) break;
    const batch = highlights.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((h) =>
        searchSimilar(h.text, h.book.id, 2)
          .then((r) => ({ h, r }))
          .catch(() => ({ h, r: [] as { id: number; text: string; book_id: number }[] })),
      ),
    );
    for (const { h, r } of results) {
      for (const hit of r) {
        if (!knownIds.has(hit.id)) continue; // only link nodes already in graph
        if (hit.id === h.id) continue;
        const key = h.id < hit.id ? `${h.id}-${hit.id}` : `${hit.id}-${h.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        connections.push({ highlightId: h.id, relatedId: hit.id, snippet: hit.text });
        if (connections.length >= maxEdges) break;
      }
    }
    onProgress(Math.min(i + batchSize, highlights.length), highlights.length);
  }
  return connections;
}
