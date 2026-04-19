import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";

export function useGraphWheelPan(fgRef: MutableRefObject<ForceGraphMethods | undefined>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      const fg = fgRef.current;
      if (!fg) return;
      if (e.ctrlKey) return; // pinch-to-zoom passes through
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const currentZoom = fg.zoom();
      const dx = e.deltaX / currentZoom;
      const dy = e.deltaY / currentZoom;
      const center = fg.centerAt();
      fg.centerAt((center.x ?? 0) + dx, (center.y ?? 0) + dy, 0);
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    const handleMove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const handleLeave = () => setMousePos(null);
    wrapper.addEventListener("mousemove", handleMove);
    wrapper.addEventListener("mouseleave", handleLeave);

    return () => {
      wrapper.removeEventListener("wheel", handleWheel, true);
      wrapper.removeEventListener("mousemove", handleMove);
      wrapper.removeEventListener("mouseleave", handleLeave);
    };
  }, [fgRef]);

  return { wrapperRef, mousePos };
}
