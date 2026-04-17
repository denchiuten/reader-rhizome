import { useCallback, useEffect, useState } from "react";
import { fetchHighlights, findCrossConnections } from "@/lib/readwise";
import type { CrossConnection, Highlight } from "@/types/highlight";

const CACHE_KEY = "highlight-graph:cache:v1";
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
  });

  const load = useCallback(async (force = false) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    // Try cache
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: CachedData = JSON.parse(raw);
          if (Date.now() - cached.fetchedAt < CACHE_TTL) {
            setState({
              highlights: cached.highlights,
              connections: cached.connections,
              loading: false,
              connectionsLoading: false,
              progress: { done: cached.highlights.length, total: cached.highlights.length },
              error: null,
              fetchedAt: cached.fetchedAt,
            });
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      const highlights = await fetchHighlights();
      setState((s) => ({
        ...s,
        highlights,
        loading: false,
        connectionsLoading: true,
        progress: { done: 0, total: highlights.length },
        fetchedAt: Date.now(),
      }));

      const connections = await findCrossConnections(highlights, (done, total) => {
        setState((s) => ({ ...s, progress: { done, total } }));
      });

      const fetchedAt = Date.now();
      setState((s) => ({
        ...s,
        connections,
        connectionsLoading: false,
        fetchedAt,
      }));
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ highlights, connections, fetchedAt } as CachedData),
        );
      } catch {
        // ignore quota
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch highlights";
      setState((s) => ({ ...s, loading: false, connectionsLoading: false, error: msg }));
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return { ...state, refresh: () => load(true) };
}
