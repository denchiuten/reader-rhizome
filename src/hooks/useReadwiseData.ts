import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHighlights } from "@/lib/readwise";
import { findCrossConnectionsLocal } from "@/lib/connections";
import type { CategoryKey } from "@/lib/categories";
import type { CrossConnection, Highlight } from "@/types/highlight";

const CACHE_PREFIX = "highlight-graph:cache:v5";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6h

interface CachedData {
  highlights: Highlight[];
  connections: CrossConnection[];
  fetchedAt: number;
}

interface State {
  highlights: Highlight[];
  connections: CrossConnection[];
  loading: boolean;
  connectionsLoading: boolean;
  progress: { done: number; total: number };
  error: string | null;
  fetchedAt: number | null;
  categories: CategoryKey[];
}

function cacheKey(categories: CategoryKey[]): string {
  const suffix = categories.length === 0 ? "all" : [...categories].sort().join(",");
  return `${CACHE_PREFIX}:${suffix}`;
}

export function useReadwiseData() {
  const [state, setState] = useState<State>({
    highlights: [],
    connections: [],
    loading: true,
    connectionsLoading: false,
    progress: { done: 0, total: 0 },
    error: null,
    fetchedAt: null,
    categories: [],
  });

  const reqIdRef = useRef(0);

  const load = useCallback(async (categories: CategoryKey[], force = false) => {
    const reqId = ++reqIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null, categories }));

    if (!force) {
      try {
        const raw = localStorage.getItem(cacheKey(categories));
        if (raw) {
          const cached: CachedData = JSON.parse(raw);
          if (Date.now() - cached.fetchedAt < CACHE_TTL) {
            if (reqId !== reqIdRef.current) return;
            setState({
              highlights: cached.highlights,
              connections: cached.connections,
              loading: false,
              connectionsLoading: false,
              progress: { done: cached.highlights.length, total: cached.highlights.length },
              error: null,
              fetchedAt: cached.fetchedAt,
              categories,
            });
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      const highlights = await fetchHighlights(categories);
      if (reqId !== reqIdRef.current) return;
      setState((s) => ({
        ...s,
        highlights,
        loading: false,
        connectionsLoading: true,
        progress: { done: 0, total: highlights.length },
        fetchedAt: Date.now(),
      }));

      await new Promise((r) => setTimeout(r, 30));
      if (reqId !== reqIdRef.current) return;
      const connections = findCrossConnectionsLocal(highlights, {
        minScore: 0.08,
        maxEdges: 60,
        perNode: 2,
      });

      const fetchedAt = Date.now();
      if (reqId !== reqIdRef.current) return;
      setState((s) => ({
        ...s,
        connections,
        connectionsLoading: false,
        progress: { done: highlights.length, total: highlights.length },
        fetchedAt,
      }));
      try {
        localStorage.setItem(
          cacheKey(categories),
          JSON.stringify({ highlights, connections, fetchedAt } as CachedData),
        );
      } catch {
        // ignore quota
      }
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to fetch highlights";
      setState((s) => ({ ...s, loading: false, connectionsLoading: false, error: msg }));
    }
  }, []);

  useEffect(() => {
    load([], false);
  }, [load]);

  const setCategories = useCallback(
    (cats: CategoryKey[]) => {
      load(cats, false);
    },
    [load],
  );

  const refresh = useCallback(() => load(state.categories, true), [load, state.categories]);

  return { ...state, refresh, setCategories };
}
