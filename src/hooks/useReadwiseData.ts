import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { fetchHighlights } from "@/lib/readwise";
import { fetchEmbeddings, type VectorMap } from "@/lib/embeddings";
import {
  findCrossConnectionsLocal,
  findCrossConnectionsSemantic,
} from "@/lib/connections";
import type { CategoryKey } from "@/lib/categories";
import type { CrossConnection, Highlight } from "@/types/highlight";

const CACHE_KEY = "highlight-graph:cache:v8";
const VECTOR_CACHE_KEY = "highlight-graph:vectors:v1";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6h
const DISPLAY_CAP = 400;

interface CachedPool {
  highlights: Highlight[];
  fetchedAt: number;
}

interface CachedVectors {
  // id -> vector
  entries: Array<[number, number[]]>;
  savedAt: number;
}

function loadVectorCache(): VectorMap {
  try {
    const raw = localStorage.getItem(VECTOR_CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as CachedVectors;
    return new Map(parsed.entries);
  } catch {
    return new Map();
  }
}

function saveVectorCache(map: VectorMap) {
  try {
    const payload: CachedVectors = {
      entries: Array.from(map.entries()),
      savedAt: Date.now(),
    };
    localStorage.setItem(VECTOR_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota — ignore
  }
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
  const [vectors, setVectors] = useState<VectorMap>(() => new Map());
  const [vectorsReady, setVectorsReady] = useState<boolean>(false);
  const [semanticThreshold, setSemanticThreshold] = useState<number>(0.30);

  // Hydrate vector cache from localStorage on mount (avoids HMR hook-order issues)
  useEffect(() => {
    const cached = loadVectorCache();
    if (cached.size > 0) setVectors(cached);
  }, []);

  const reqIdRef = useRef(0);

  // Filter pool: categories OR, tags OR (highlight matches any selected)
  const highlights = useMemo(() => {
    const result = allHighlights
      .filter(
        (h) =>
          categories.length === 0 ||
          (h.book.category && categories.includes(h.book.category as CategoryKey)),
      )
      .filter(
        (h) =>
          tags.length === 0 ||
          (h.book.tags || []).some((t) => tags.includes(t)),
      )
      .slice(0, DISPLAY_CAP);

    // Diagnostic: highlights-per-source distribution
    if (result.length > 0) {
      const perSource = new Map<string, number>();
      for (const h of result) {
        const key = h.book.title || `book-${h.book.id}`;
        perSource.set(key, (perSource.get(key) || 0) + 1);
      }
      const sorted = [...perSource.entries()].sort((a, b) => b[1] - a[1]);
      const total = result.length;
      const sourceCount = sorted.length;
      const avg = (total / sourceCount).toFixed(2);
      const singletons = sorted.filter(([, c]) => c === 1).length;
      console.log(
        `[diag] DISPLAY_CAP=${DISPLAY_CAP} highlights=${total} sources=${sourceCount} avg/source=${avg} singletons=${singletons}`,
      );
      console.table(
        sorted.slice(0, 30).map(([title, count]) => ({ title, count })),
      );
    }

    return result;
  }, [allHighlights, categories, tags]);

  // Recompute connections whenever the filtered set or vectors change.
  useEffect(() => {
    if (highlights.length === 0) {
      setConnections([]);
      setConnectionsLoading(false);
      return;
    }
    setConnectionsLoading(true);
    const id = ++reqIdRef.current;
    const handle = setTimeout(() => {
      // Use semantic if we have vectors for most of the filtered highlights
      const covered = highlights.filter((h) => vectors.has(h.id)).length;
      const useSemantic = vectorsReady && covered / highlights.length >= 0.6;
      // Scale connection caps with pool size so density stays roughly constant.
      // Baseline: 300 highlights → 220 semantic edges, 7 per node.
      const scale = highlights.length / 300;
      const semanticMaxEdges = Math.round(220 * scale);
      const semanticPerNode = Math.max(5, Math.round(7 * scale));
      const lexicalMaxEdges = Math.round(120 * scale);
      const lexicalPerNode = Math.max(3, Math.round(4 * scale));
      const conns = useSemantic
        ? findCrossConnectionsSemantic(highlights, vectors, {
            minScore: semanticThreshold,
            maxEdges: semanticMaxEdges,
            perNode: semanticPerNode,
          })
        : findCrossConnectionsLocal(highlights, {
            minScore: 0.05,
            maxEdges: lexicalMaxEdges,
            perNode: lexicalPerNode,
          });
      if (id !== reqIdRef.current) return;
      // Diagnostic: edge density
      const degree = new Map<number, number>();
      for (const c of conns) {
        degree.set(c.highlightId, (degree.get(c.highlightId) || 0) + 1);
        degree.set(c.relatedId, (degree.get(c.relatedId) || 0) + 1);
      }
      const connected = degree.size;
      const avgDeg = connected > 0
        ? ([...degree.values()].reduce((a, b) => a + b, 0) / connected).toFixed(2)
        : "0";
      console.log(
        `[diag] mode=${useSemantic ? "semantic" : "lexical"} edges=${conns.length} connected=${connected}/${highlights.length} avgDeg=${avgDeg} scale=${scale.toFixed(2)}`,
      );
      setConnections(conns);
      setConnectionsLoading(false);
    }, 30);
    return () => clearTimeout(handle);
  }, [highlights, vectors, vectorsReady, semanticThreshold]);

  // Kick off embedding fetch whenever the full pool changes.
  useEffect(() => {
    if (allHighlights.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchEmbeddings(allHighlights);
        if (cancelled) return;
        setVectors(map);
        setVectorsReady(true);
        saveVectorCache(map);
      } catch (err) {
        console.warn("Embedding fetch failed; using lexical fallback.", err);
        if (!cancelled) {
          setVectorsReady(false);
          toast({
            title: "Using lexical fallback",
            description: "Couldn't compute semantic connections.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allHighlights]);

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
    semanticThreshold,
    setSemanticThreshold,
    refresh,
  };
}
