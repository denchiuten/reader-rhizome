import { supabase } from "@/integrations/supabase/client";
import type { Highlight } from "@/types/highlight";

export async function fetchHighlights(
  categories?: string[],
  tags?: string[],
): Promise<Highlight[]> {
  const { data, error } = await supabase.functions.invoke("readwise-fetch", {
    body: {
      categories: categories && categories.length > 0 ? categories : undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
    },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data.highlights as Highlight[];
}

export async function fetchAvailableTags(): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("readwise-fetch", {
    body: { listTags: true },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return (data.tags as string[]) || [];
}
