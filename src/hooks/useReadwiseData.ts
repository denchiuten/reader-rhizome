import { useCallback, useEffect, useState } from "react";
import { fetchHighlights } from "@/lib/readwise";
import { findCrossConnectionsLocal } from "@/lib/connections";
import type { CrossConnection, Highlight } from "@/types/highlight";

const CACHE_KEY = "highlight-graph:cache:v2";
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

      // Local similarity — fast, runs synchronously but yield to UI first
      await new Promise((r) => setTimeout(r, 30));
      const connections = findCrossConnectionsLocal(highlights, {
        minScore: 0.08,
        maxEdges: 60,
        perNode: 2,
      });

      const fetchedAt = Date.now();
      setState((s) => ({
        ...s,
        connections,
        connectionsLoading: false,
        progress: { done: highlights.length, total: highlights.length },
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
