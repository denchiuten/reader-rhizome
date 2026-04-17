import { supabase } from "@/integrations/supabase/client";
import type { Highlight } from "@/types/highlight";

export async function fetchHighlights(categories?: string[]): Promise<Highlight[]> {
  const { data, error } = await supabase.functions.invoke("readwise-fetch", {
    body: { categories: categories && categories.length > 0 ? categories : undefined },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data.highlights as Highlight[];
}
