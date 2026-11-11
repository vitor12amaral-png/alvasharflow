import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getTour, ONBOARDING_ID, shouldAutoStart, type TourStep } from "@/lib/tours";

type Step = TourStep;
const doneKey = (userId: string) => `alvashar-tour-done:${userId}`;
const STEP_KEY = "alvashar-tour-step";
export const TOUR_START_EVENT = "alvashar-tour-start";

/** Inicia um tutorial (o de primeiros passos por padrão). */
export function restartTour(id: string = ONBOARDING_ID) {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT, { detail: id }));
}

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(sel?: string): HTMLElement | null {
  if (!sel) return null;
  const all = Array.from(document.querySelectorAll<HTMLElement>(sel));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

export function GuidedTour({ userId }: { userId: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState({ w: 1280, h: 800 });
  const location = useLocation();
  const navigate = useNavigate();
  const [tourId, setTourId] = useState(ONBOARDING_ID);
  const TOUR_STEPS = getTour(tourId).steps;
  const step = index === null ? null : TOUR_STEPS[index];
  const sawDialog = useRef(false);

  // Abre sozinho só para quem nunca concluiu nem pulou (salvo na conta).
  useEffect(() => {
    let alive = true;
    const savedId = sessionStorage.getItem(STEP_KEY + ":id") ?? ONBOARDING_ID;
    const saved = Number(sessionStorage.getItem(STEP_KEY));
    if (sessionStorage.getItem(STEP_KEY) !== null && Number.isFinite(saved)) { setTourId(savedId); setIndex(saved); }
    else if (localStorage.getItem(doneKey(userId)) !== "1") {
      supabase.from("profiles").select("tour_completed_at").eq("id", userId).maybeSingle().then(({ data }) => {
        if (!alive) return;
        if (data && shouldAutoStart(data.tour_completed_at)) { setTourId(ONBOARDING_ID); setIndex(0); }
        else if (data) localStorage.setItem(doneKey(userId), "1");
      });
    }
    const start = (e: Event) => {
      const id = (e as CustomEvent<string>).detail || ONBOARDING_ID;
      const t = getTour(id);
      setTourId(t.id);
      if (t.path && !window.location.pathname.startsWith(t.path)) navigate({ to: t.path });
      setIndex(0);
    };
    window.addEventListener(TOUR_START_EVENT, start);
    return () => { alive = false; window.removeEventListener(TOUR_START_EVENT, start); };
  }, [userId, navigate]);

  const markDone = useCallback(() => {
    if (tourId !== ONBOARDING_ID) return;
    localStorage.setItem(doneKey(userId), "1");
    void supabase.from("profiles").update({ tour_completed_at: new Date().toISOString() }).eq("id", userId);
  }, [userId, tourId]);

  const finish = useCallback(() => {
    markDone();
    setIndex(null);
    setRect(null);
  }, [markDone]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i === null) return null;
      let n = i + 1;
      while (n < TOUR_STEPS.length && TOUR_STEPS[n].skipIfAt && window.location.pathname.startsWith(TOUR_STEPS[n].skipIfAt!)) n++;
      if (n >= TOUR_STEPS.length) { markDone(); return null; }
      return n;
    });
  }, [markDone, TOUR_STEPS]);

  useEffect(() => {
    sawDialog.current = false;
    if (index === null) { sessionStorage.removeItem(STEP_KEY); sessionStorage.removeItem(STEP_KEY + ":id"); }
    else { sessionStorage.setItem(STEP_KEY, String(index)); sessionStorage.setItem(STEP_KEY + ":id", tourId); }
  }, [index, tourId]);

  // Acompanha a posição do alvo (ele pode surgir, mover ou rolar).
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    const tick = () => {
      setVw({ w: window.innerWidth, h: window.innerHeight });
      const el = findTarget(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect((old) => (old && Math.abs(old.top - r.top) < 0.5 && Math.abs(old.left - r.left) < 0.5 && Math.abs(old.width - r.width) < 0.5 && Math.abs(old.height - r.height) < 0.5 ? old : { top: r.top, left: r.left, width: r.width, height: r.height }));
      } else setRect(null);
      if (step.mode === "dialog-close") {
        if (el) sawDialog.current = true;
        else if (sawDialog.current) { sawDialog.current = false; next(); }
      }
      raf = window.setTimeout(tick, 120) as unknown as number;
    };
    const first = step.target ? findTarget(step.target) : null;
    first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    tick();
    return () => window.clearTimeout(raf);
  }, [step, next]);

  // Avanço ao chegar na tela pedida.
  useEffect(() => {
    if (step?.mode === "route" && step.path && location.pathname.startsWith(step.path)) next();
  }, [step, location.pathname, next]);

  // Avanço ao clicar no alvo.
  useEffect(() => {
    if (step?.mode !== "click") return;
    const onClick = (e: MouseEvent) => {
      const el = findTarget(step.target);
      if (el && e.target instanceof Node && el.contains(e.target)) window.setTimeout(next, 250);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [step, next]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, finish]);

  if (!step || index === null) return null;

  const pad = 6;
  const hole = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const cardW = Math.min(340, vw.w - 24);
  const below = hole ? hole.top + hole.height + 210 < vw.h || hole.top < 220 : false;
  const cardTop = hole ? (below ? Math.min(hole.top + hole.height + 18, vw.h - 200) : Math.max(12, hole.top - 18 - 190)) : vw.h / 2 - 110;
  const off = step.offset ?? 0;
  const cardLeft = hole && off ? Math.min(hole.left + off, vw.w - cardW - 12) : hole ? Math.min(Math.max(12, hole.left + hole.width / 2 - cardW / 2), vw.w - cardW - 12) : vw.w / 2 - cardW / 2;
  // Alvo grande (ex.: janela de cadastro): caixa ao lado; sem espaço, vira uma faixa compacta no maior vão livre.
  const big = !!hole && hole.height > 280;
  let side: "left" | "right" | null = null;
  if (big && hole) {
    if (hole.left + hole.width + cardW + 24 < vw.w) side = "right";
    else if (hole.left - cardW - 24 > 0) side = "left";
  }
  const compact = big && !side;
  const gapTop = hole ? hole.top : 0;
  const gapBottom = hole ? vw.h - (hole.top + hole.height) : 0;
  const compactW = Math.min(420, vw.w - 16);
  const finalTop = side && hole ? Math.min(Math.max(12, hole.top + hole.height / 2 - 110), vw.h - 240)
    : compact ? (gapBottom > gapTop ? vw.h - 8 - 92 : 8) : cardTop;
  const finalLeft = side === "right" && hole ? hole.left + hole.width + 20 : side === "left" && hole ? hole.left - cardW - 20
    : compact ? vw.w / 2 - compactW / 2 : cardLeft;
  const showArrow = !!hole && !big;
  const arrowLeft = hole ? Math.min(Math.max(16, hole.left + hole.width / 2 - cardLeft - 10), cardW - 36) : 0;
  const needsTrip = !rect && step.path && !location.pathname.startsWith(step.path);
  const waiting = step.mode !== "next";
  const isLast = index === TOUR_STEPS.length - 1;

  return (
    <>
      {step.mode === "dialog-close" && hole ? null : hole ? (
        <div className="tour-hole" style={{ ...hole, zIndex: 45 }} aria-hidden />
      ) : (
        <div className="fixed inset-0 z-[45] bg-[oklch(0.05_0.01_260/0.74)] backdrop-blur-[2px]" aria-hidden />
      )}
      <div
        role="region"
        aria-live="polite"
        aria-label={step.title}
        data-tour-card
        className="glass-apple fixed z-[60] text-foreground", compact ? "rounded-2xl p-3" : "rounded-2xl p-5", " animate-in fade-in-0 zoom-in-95"
        style={{ top: finalTop, left: finalLeft, width: compact ? compactW : cardW, pointerEvents: "auto" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {compact ? (
          <div className="flex items-center gap-3 px-1">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{step.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{step.body}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={next}>Pular passo</Button>
            <button onClick={finish} className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar tutorial"><X className="h-4 w-4" /></button>
          </div>
        ) : (<>
        {showArrow && (
          <span className={cn("tour-arrow absolute text-primary", below ? "-top-6" : "-bottom-6")} style={{ left: arrowLeft }}>
            {below ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
          </span>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Passo {index + 1} de {TOUR_STEPS.length}
          </div>
          <button onClick={finish} className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar tutorial"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 font-display text-lg font-semibold tracking-tight">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/[0.08]">
          <div className="h-full rounded-full bg-[image:var(--gradient-cta)] transition-all" style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Pular tutorial</button>
          <div className="flex gap-2">
            {needsTrip && (
              <Button size="sm" variant="outline" onClick={() => navigate({ to: step.path! })}>Me leve até lá</Button>
            )}
            {waiting ? (
              <Button size="sm" variant="ghost" onClick={next}>Pular passo</Button>
            ) : (
              <Button size="sm" onClick={isLast ? finish : next}>{index === 0 ? "Começar" : isLast ? "Concluir" : "Próximo"}</Button>
            )}
          </div>
        </div>
        </>)}
      </div>
    </>
  );
}
