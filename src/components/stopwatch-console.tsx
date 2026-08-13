import { useEffect, useMemo, useState } from "react";
import { useTimer, useVideoPace, fmtClock, fmtEstimate } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, Square, Flag, ChevronDown, Layers, Check, Trash2, Timer, X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDock } from "@/lib/dock";

export type TimerBatch = {
  id: string;
  label: string;
  videoIds: string[];
  remaining: number;
};

/** Mostrador digital com glow — visual "console" tecnológico. */
function Readout({ ms, paused }: { ms: number; paused: boolean }) {
  const total = Math.floor(ms);
  const cs = Math.floor((ms - total) * 100);
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] px-3 py-2.5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, color-mix(in oklab, var(--primary) 45%, transparent) 0px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="relative flex items-baseline justify-center gap-1">
        <span
          className={cn(
            "font-mono text-[2.4rem] font-semibold leading-none tracking-tight tabular-nums transition-colors",
            paused ? "text-muted-foreground" : "text-primary",
          )}
          style={!paused ? { textShadow: "0 0 18px color-mix(in oklab, var(--primary) 45%, transparent)" } : undefined}
        >
          {fmtClock(total)}
        </span>
        <span className={cn("font-mono text-base leading-none tabular-nums", paused ? "text-muted-foreground/60" : "text-primary/70")}>
          .{String(cs).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

/**
 * Console do cronômetro: peça separada, com seletor de leva embutido.
 * Escolha a leva, dê play e marque cada vídeo pronto com "volta".
 */
export function StopwatchConsole({ batches }: { batches: TimerBatch[] }) {
  const { active, elapsedMs, laps, paused, start, stop, toggle, lap, discard } = useTimer(true);
  const { isOpen, showLauncher, toggleDock, closeDock } = useDock();
  const min = !isOpen("timer");
  const [pickId, setPickId] = useState<string>("");

  const running = !!active;
  const selected = useMemo(
    () => batches.find((b) => b.id === pickId) ?? batches[0] ?? null,
    [batches, pickId],
  );

  // Se um cronômetro já roda, o console reflete a leva em execução.
  const activeIds = active?.batchIds ?? null;
  const activeBatch = useMemo(
    () => (activeIds ? batches.find((b) => b.videoIds.join(",") === activeIds.join(",")) ?? null : null),
    [batches, activeIds],
  );

  useEffect(() => {
    if (!pickId && batches.length) setPickId(batches[0].id);
  }, [batches, pickId]);

  const { data: pace } = useVideoPace(activeBatch?.videoIds ?? selected?.videoIds);
  const done = laps.length;
  const totalVideos = activeBatch?.remaining ?? active?.batchIds?.length ?? 0;
  const liveAvg = done > 0 ? Math.round(laps[done - 1] / done) : 0;
  const avg = liveAvg || (pace?.avgPerVideo ?? 0);
  const left = Math.max(0, (totalVideos || selected?.remaining || 0) - (running ? done : 0));
  const eta = avg > 0 ? avg * left : 0;

  if (min) {
    if (!showLauncher) return null;
    return (
      <button
        onClick={() => toggleDock("timer")}
        aria-label="Cronômetro"
        className={cn(
          "fixed bottom-6 right-[4.75rem] z-40 flex h-11 w-11 items-center justify-center rounded-2xl border bg-card/80 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 active:scale-95",
          running && !paused
            ? "border-primary/50 text-primary shadow-[0_12px_36px_-12px_color-mix(in_oklab,var(--primary)_85%,transparent)]"
            : "border-white/10 text-muted-foreground shadow-[0_10px_30px_-14px_oklch(0_0_0)] hover:text-foreground",
        )}
      >
        <Timer className={cn("h-5 w-5", running && !paused && "animate-pulse")} />
        {running && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[19.5rem] duration-300 animate-in fade-in slide-in-from-bottom-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.35rem] border bg-card/70 p-3.5 shadow-[0_30px_80px_-30px_oklch(0_0_0)] backdrop-blur-2xl transition",
          running && !paused ? "border-primary/45 ring-1 ring-primary/15" : "border-border",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent)" }}
        />

        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", running && !paused ? "bg-primary animate-pulse" : "bg-muted-foreground/50")} />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {running ? (paused ? "Pausado" : "Rodando") : "Cronômetro"}
          </p>
          <button
            onClick={closeDock}
            className="ml-auto rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Seletor de leva */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              disabled={running}
              className={cn(
                "mt-2 flex w-full items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 text-left transition",
                !running && "hover:border-primary/50",
                running && "opacity-80",
              )}
            >
              <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {running ? active?.label : selected?.label ?? "Nenhuma leva disponível"}
              </span>
              {!running && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="max-h-72 w-72 overflow-y-auto p-1">
            {batches.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Nenhuma leva no período</p>
            )}
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setPickId(b.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition hover:bg-muted"
              >
                <span className="min-w-0 flex-1 truncate">{b.label}</span>
                <span className="text-[10px] text-muted-foreground">{b.remaining}</span>
                {selected?.id === b.id && <Check className="h-3 w-3 text-primary" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <div className="mt-2.5">
          <Readout ms={elapsedMs} paused={paused} />
        </div>

        {running && totalVideos > 1 && (
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{done} de {totalVideos} prontos</span>
              {avg > 0 && <span className="font-mono">{fmtEstimate(avg)}/vídeo</span>}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (done / totalVideos) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-2 text-[11px] text-muted-foreground">
          {avg > 0 ? (
            <>Faltam {left} ≈ <b className="font-mono text-foreground">{fmtEstimate(eta)}</b></>
          ) : (
            "Sem histórico ainda — cronometre para o sistema aprender"
          )}
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {running ? (
            <>
              <Button size="sm" variant={paused ? "default" : "outline"} onClick={toggle}>
                {paused ? <><Play className="mr-1 h-3.5 w-3.5" />Seguir</> : <><Pause className="mr-1 h-3.5 w-3.5" />Pausar</>}
              </Button>
              <Button size="sm" variant="outline" onClick={lap} title="Marcar vídeo pronto">
                <Flag className="mr-1 h-3.5 w-3.5" />Volta
              </Button>
              <Button size="sm" onClick={() => stop()}>
                <Square className="mr-1 h-3.5 w-3.5" />Parar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="col-span-3"
              disabled={!selected}
              onClick={() =>
                selected &&
                start({
                  label: selected.label,
                  batchIds: selected.videoIds,
                  videoId: selected.videoIds[0],
                  notes: `Leva: ${selected.label}`,
                })
              }
            >
              <Play className="mr-1 h-3.5 w-3.5" />Iniciar leva
            </Button>
          )}
        </div>

        {running && laps.length > 0 && (
          <div className="mt-2 max-h-24 space-y-0.5 overflow-y-auto rounded-lg border border-border/60 p-1.5">
            {laps.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Vídeo {i + 1}</span>
                <span className="font-mono tabular-nums">{fmtClock(Math.round(l - (laps[i - 1] ?? 0)))}</span>
              </div>
            ))}
          </div>
        )}

        {running && (
          <button
            onClick={() => { if (confirm("Descartar esta sessão sem registrar o tempo?")) discard(); }}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] text-muted-foreground transition hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />Descartar sessão
          </button>
        )}
      </div>
    </div>
  );
}
