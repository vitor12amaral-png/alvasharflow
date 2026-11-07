const SELECTOR = ".card-ref, .card-featured, .panel-landing, .panel-apple, [data-spot], main .border.rounded-lg, main .border.rounded-xl, main .border.rounded-2xl";

/** Liga a luz que acompanha o mouse em cartões/painéis e no fundo da página. */
export function installSpotlight(): () => void {
  let frame = 0;
  let last: PointerEvent | null = null;
  const apply = () => {
    frame = 0;
    const e = last;
    if (!e) return;
    document.documentElement.style.setProperty("--gx", `${e.clientX}px`);
    document.documentElement.style.setProperty("--gy", `${e.clientY}px`);
    const target = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
    if (target) {
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${e.clientX - r.left}px`);
      target.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
  };
  const onMove = (e: PointerEvent) => {
    last = e;
    if (!frame) frame = requestAnimationFrame(apply);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    if (frame) cancelAnimationFrame(frame);
  };
}
