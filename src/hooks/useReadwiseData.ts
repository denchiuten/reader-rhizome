import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { fetchHighlights } from "@/lib/readwise";
import { findCrossConnectionsLocal } from "@/lib/connections";
import type { CategoryKey } from "@/lib/categories";
import type { CrossConnection, Highlight } from "@/types/highlight";

const CACHE_KEY = "highlight-graph:cache:v7";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6h
const DISPLAY_CAP = 200;

interface CachedPool {
  highlights: Highlight[];
  fetchedAt: number;
}

export function useReadwiseData() {
  const [allHighlights, setAllHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryKey[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [connections, setConnections] = useState<CrossConnection[]>([]);

  const reqIdRef = useRef(0);

  // Filter pool: categories OR, tags OR (highlight matches any selected)
  const highlights = useMemo(() => {
    return allHighlights
      .filter(
        (h) =>
          categories.length === 0 ||
          (h.book.category && categories.includes(h.book.category as CategoryKey)),
      )
      .filter(
        (h) =>
          tags.length === 0 ||
          (h.book.tags || []).some((t) => tags.includes(t)), // OR within tags
      )
      .slice(0, DISPLAY_CAP);
  }, [allHighlights, categories, tags]);

  // Recompute connections whenever the filtered set changes.
  useEffect(() => {
    if (highlights.length === 0) {
      setConnections([]);
      setConnectionsLoading(false);
      return;
    }
    setConnectionsLoading(true);
    const id = ++reqIdRef.current;
    const handle = setTimeout(() => {
      const conns = findCrossConnectionsLocal(highlights, {
        minScore: 0.08,
        maxEdges: 60,
        perNode: 2,
      });
      if (id !== reqIdRef.current) return;
      setConnections(conns);
      setConnectionsLoading(false);
    }, 30);
    return () => clearTimeout(handle);
  }, [highlights]);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    let cached: CachedPool | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw) as CachedPool;
    } catch {
      // ignore
    }

    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setAllHighlights(cached.highlights);
      setFetchedAt(cached.fetchedAt);
      setLoading(false);
      return;
    }

    try {
      const pool = await fetchHighlights();
      const now = Date.now();
      setAllHighlights(pool);
      setFetchedAt(now);
      setLoading(false);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ highlights: pool, fetchedAt: now } as CachedPool),
        );
      } catch {
        // ignore quota
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch highlights";
      // Graceful fallback: keep showing cached data if we have it.
      if (cached) {
        setAllHighlights(cached.highlights);
        setFetchedAt(cached.fetchedAt);
        setLoading(false);
        toast({
          title: "Couldn't refresh",
          description: "Showing cached highlights.",
        });
      } else {
        setError(msg);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    highlights,
    connections,
    loading,
    connectionsLoading,
    progress: { done: highlights.length, total: highlights.length },
    error,
    fetchedAt,
    categories,
    tags,
    setCategories,
    setTags,
    refresh,
  };
}
