import { useCallback, useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Seleção por arrasto (marquee). Clique no fundo e arraste para selecionar
 * todos os elementos com `data-vid` que forem tocados pelo retângulo.
 */
export function useMarquee(onSelect: (ids: string[], additive: boolean) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-vid]") || target.closest("button") || target.closest("input") || target.closest("a")) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    start.current = { x: e.clientX - box.left + (containerRef.current?.scrollLeft ?? 0), y: e.clientY - box.top, additive: e.shiftKey || e.metaKey || e.ctrlKey };
    setRect({ x: start.current.x, y: start.current.y, w: 0, h: 0 });
  }, []);

  useEffect(() => {
    if (!rect) return;

    function move(e: PointerEvent) {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box || !start.current) return;
      const cx = e.clientX - box.left + (containerRef.current?.scrollLeft ?? 0);
      const cy = e.clientY - box.top;
      setRect({
        x: Math.min(start.current.x, cx),
        y: Math.min(start.current.y, cy),
        w: Math.abs(cx - start.current.x),
        h: Math.abs(cy - start.current.y),
      });
    }

    function up() {
      const container = containerRef.current;
      const s = start.current;
      start.current = null;
      if (container && s) {
        const sel = document.querySelector("[data-marquee-rect]") as HTMLElement | null;
        const r = sel?.getBoundingClientRect();
        if (r && (r.width > 4 || r.height > 4)) {
          const ids: string[] = [];
          container.querySelectorAll<HTMLElement>("[data-vid]").forEach((el) => {
            const b = el.getBoundingClientRect();
            const hit = b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
            if (hit) ids.push(el.dataset.vid!);
          });
          if (ids.length) onSelect(ids, s.additive);
        }
      }
      setRect(null);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [rect, onSelect]);

  const overlay = rect ? (
    <div
      data-marquee-rect
      className="pointer-events-none absolute z-30 rounded-sm border border-primary/70 bg-primary/10"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  ) : null;

  return { containerRef, onPointerDown, overlay, active: !!rect };
}
