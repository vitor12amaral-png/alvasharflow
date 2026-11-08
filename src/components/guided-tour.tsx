import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "next" | "route" | "click" | "dialog-close";
type Step = {
  title: string;
  body: string;
  /** Seletor do elemento destacado; sem ele o passo aparece no centro. */
  target?: string;
  /** Como o passo avança: botão, chegar numa tela, clicar no alvo ou concluir a janela. */
  mode: Mode;
  /** Tela onde o passo acontece (para o atalho "Me leve até lá"). */
  path?: string;
  /** Pula o passo quando já estiver nesta tela. */
  skipIfAt?: string;
};

export const TOUR_STEPS: Step[] = [
  { mode: "next", title: "Bem-vindo ao AlvasharFlow", body: "Em 1 minuto você aprende o essencial fazendo de verdade: criar seu primeiro cliente, lançar uma leva e acompanhar no Workflow." },
  { mode: "next", target: '[data-tour="nav"]', title: "Suas abas", body: "Tudo fica aqui no topo. Passe o mouse sobre um grupo e as opções aparecem na hora, sem clicar." },
  { mode: "route", target: '[data-tour="nav-clientes"]', path: "/clientes", skipIfAt: "/clientes", title: "Abra seus clientes", body: "Passe o mouse em Clientes e escolha Clientes." },
  { mode: "click", target: '[data-tour="new-client"]', path: "/clientes", title: "Crie seu primeiro cliente", body: "Clique em Novo cliente." },
  { mode: "dialog-close", target: '[role="dialog"]', path: "/clientes", title: "Preencha e salve", body: "Digite o nome do cliente e o pacote, depois clique em Salvar. Pode ser um cliente de teste." },
  { mode: "route", target: '[data-tour="nav-trabalho"]', path: "/workflow", skipIfAt: "/workflow", title: "Vá para o Workflow", body: "Passe o mouse em Trabalho e escolha Workflow. É aqui que os vídeos andam." },
  { mode: "next", target: '[data-tour="new-batch"]', path: "/workflow", title: "Nova leva", body: "Aqui você lança os vídeos do mês de um cliente de uma vez. O mês da leva é independente do prazo." },
  { mode: "next", target: '[data-tour="board"]', path: "/workflow", title: "Seu quadro", body: "Arraste os cartões entre as etapas. Passe o mouse num cartão para avançar etapa ou escolher o editor na hora." },
  { mode: "next", target: '[data-tour="copilot"]', title: "Seu copiloto", body: "Toque na bolinha e fale. Ele cria levas, move vídeos e responde por voz." },
  { mode: "next", title: "Tudo pronto!", body: "Em Configurações → Aparência você troca as cores do app inteiro, e pode refazer este tutorial quando quiser." },
];

const doneKey = (userId: string) => `alvashar-tour-done:${userId}`;
export const TOUR_START_EVENT = "alvashar-tour-start";

/** Reinicia o tutorial (usado em Configurações). */
export function restartTour() {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT));
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
  const step = index === null ? null : TOUR_STEPS[index];
  const sawDialog = useRef(false);

  // Abre sozinho na primeira entrada; pode ser reaberto pelo evento.
  useEffect(() => {
    if (localStorage.getItem(doneKey(userId)) !== "1") setIndex(0);
    const start = () => { setIndex(0); };
    window.addEventListener(TOUR_START_EVENT, start);
    return () => window.removeEventListener(TOUR_START_EVENT, start);
  }, [userId]);

  const finish = useCallback(() => {
    localStorage.setItem(doneKey(userId), "1");
    setIndex(null);
    setRect(null);
  }, [userId]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i === null) return null;
      let n = i + 1;
      while (n < TOUR_STEPS.length && TOUR_STEPS[n].skipIfAt && window.location.pathname.startsWith(TOUR_STEPS[n].skipIfAt!)) n++;
      if (n >= TOUR_STEPS.length) { localStorage.setItem(doneKey(userId), "1"); return null; }
      return n;
    });
  }, [userId]);

  useEffect(() => { sawDialog.current = false; }, [index]);

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
  const cardLeft = hole ? Math.min(Math.max(12, hole.left + hole.width / 2 - cardW / 2), vw.w - cardW - 12) : vw.w / 2 - cardW / 2;
  const arrowLeft = hole ? Math.min(Math.max(16, hole.left + hole.width / 2 - cardLeft - 10), cardW - 36) : 0;
  const needsTrip = !rect && step.path && !location.pathname.startsWith(step.path);
  const waiting = step.mode !== "next";
  const isLast = index === TOUR_STEPS.length - 1;

  return (
    <>
      {hole ? (
        <div className="tour-hole" style={{ ...hole, zIndex: 45 }} aria-hidden />
      ) : (
        <div className="fixed inset-0 z-[45] bg-[oklch(0.05_0.01_260/0.74)] backdrop-blur-[2px]" aria-hidden />
      )}
      <div
        role="dialog"
        aria-label={step.title}
        data-tour-card
        className="glass-apple fixed z-[60] rounded-2xl p-5 text-foreground animate-in fade-in-0 zoom-in-95"
        style={{ top: cardTop, left: cardLeft, width: cardW }}
      >
        {hole && (
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
      </div>
    </>
  );
}
