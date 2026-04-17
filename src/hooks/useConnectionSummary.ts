import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Highlight } from "@/types/highlight";

interface SummaryState {
  summary: string | null;
  loading: boolean;
  error: string | null;
}

// Session-scoped cache, keyed by sorted (idA, idB)
const cache = new Map<string, string>();

function pairKey(a: number, b: number): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `${lo}:${hi}`;
}

function toPayload(h: Highlight) {
  return {
    id: h.id,
    text: h.text,
    note: h.note,
    title: h.book.title,
    author: h.book.author,
    category: h.book.category,
  };
}

export function useConnectionSummary(
  a: Highlight | null,
  b: Highlight | null,
  sharedTerms?: string[],
) {
  const [state, setState] = useState<SummaryState>({
    summary: null,
    loading: false,
    error: null,
  });
  const reqIdRef = useRef(0);

  const key = a && b ? pairKey(a.id, b.id) : null;

  const run = async () => {
    if (!a || !b || !key) return;
    const id = ++reqIdRef.current;

    const cached = cache.get(key);
    if (cached) {
      setState({ summary: cached, loading: false, error: null });
      return;
    }

    setState({ summary: null, loading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("summarize-connection", {
        body: { a: toPayload(a), b: toPayload(b), sharedTerms: sharedTerms ?? [] },
      });
      if (id !== reqIdRef.current) return;
      if (error) throw error;
      const summary = (data as { summary?: string })?.summary?.trim();
      if (!summary) throw new Error("Empty summary");
      cache.set(key, summary);
      setState({ summary, loading: false, error: null });
    } catch (err) {
      if (id !== reqIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to summarize";
      setState({ summary: null, loading: false, error: msg });
    }
  };

  // Auto-fetch when the pair changes
  useEffect(() => {
    if (!key) {
      setState({ summary: null, loading: false, error: null });
      return;
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...state, retry: run };
}
