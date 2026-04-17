import { supabase } from "@/integrations/supabase/client";
import type { Highlight } from "@/types/highlight";

export type VectorMap = Map<number, number[]>;

export async function fetchEmbeddings(highlights: Highlight[]): Promise<VectorMap> {
  if (highlights.length === 0) return new Map();
  const payload = highlights.map((h) => ({
    id: h.id,
    text: h.text,
    note: h.note,
  }));

  const { data, error } = await supabase.functions.invoke("embed-highlights", {
    body: { highlights: payload },
  });
  if (error) throw error;
  const map: VectorMap = new Map();
  for (const item of (data?.embeddings || []) as Array<{ id: number; vector: number[] }>) {
    if (Array.isArray(item.vector) && item.vector.length > 0) {
      map.set(item.id, item.vector);
    }
  }
  return map;
}
