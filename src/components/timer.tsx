import { useState } from "react";
import { useTimer, useTimeSummary, useVideoTime, useVideoPace, fmt, fmtClock, fmtEstimate } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Play, Pause, Square, Timer as TimerIcon, Trash2, Gauge, Flag, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Relógio grande com centésimos — o "mostrador" do cronômetro. */
function ClockDisplay({ ms, paused, size = "lg" }: { ms: number; paused: boolean; size?: "lg" | "md" }) {
  const total = Math.floor(ms);
  const cs = Math.floor((ms - total) * 100);
  return (
    <div className="flex items-baseline gap-1">
      <span
        className={cn(
          "font-mono font-semibold tabular-nums leading-none tracking-tight transition-colors",
          size === "lg" ? "text-[2.75rem]" : "text-2xl",
          paused ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {fmtClock(total)}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums leading-none",
          size === "lg" ? "text-lg" : "text-xs",
          paused ? "text-muted-foreground/60" : "text-primary",
        )}
      >
        .{String(cs).padStart(2, "0")}
      </span>
    </div>
  );
}

/**
 * Dock do cronômetro: um cronômetro de verdade, sempre visível enquanto roda.
 * Mostrador grande, pausar/retomar, marcar vídeo pronto (volta) e finalizar.
 */
export function TimerBadge() {
  const { active, elapsed, elapsedMs, laps, paused, stop, discard, toggle, setNotes, lap } = useTimer(true);
  const { data: summary } = useTimeSummary();
  const [min, setMin] = useState(false);
  if (!active) return null;

  const batch = active.batchIds ?? [];
  const done = laps.length;
  const perLap = done > 0 ? Math.round(laps[laps.length - 1] - (laps[done - 2] ?? 0)) : 0;
  const avgLap = done > 0 ? Math.round(laps[done - 1] / done) : 0;
  const remaining = Math.max(0, batch.length - done);

  if (min) {
    return (
      <div className="fixed bottom-6 right-24 z-40">
        <button
          onClick={() => setMin(false)}
          className={cn(
            "flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur transition lift hover:lift-hover",
            paused ? "border-border" : "border-primary/50",
          )}
        >
          <TimerIcon className={cn("h-3.5 w-3.5 text-primary", !paused && "animate-pulse")} />
          <span className="font-mono text-xs tabular-nums">{fmtClock(elapsed)}</span>
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-24 z-40 w-[19rem]">
      <div
        className={cn(
          "rounded-2xl border bg-card/95 p-4 shadow-2xl backdrop-blur transition",
          paused ? "border-border" : "border-primary/40 ring-1 ring-primary/10",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              paused ? "bg-muted-foreground" : "bg-primary animate-pulse",
            )}
          />
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {paused ? "Pausado" : "Cronometrando"}
          </p>
          <button
            onClick={() => setMin(true)}
            className="ml-auto rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Minimizar"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-1 truncate text-sm font-medium">{active.label}</p>

        <div className="mt-2">
          <ClockDisplay ms={elapsedMs} paused={paused} />
        </div>

        {batch.length > 1 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{done} de {batch.length} vídeos prontos</span>
              {avgLap > 0 && <span className="font-mono">{fmtEstimate(avgLap)}/vídeo</span>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (done / batch.length) * 100)}%` }}
              />
            </div>
            {avgLap > 0 && remaining > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Faltam ≈ <b className="font-mono text-foreground">{fmtEstimate(avgLap * remaining)}</b>
                {perLap > 0 && <> · última volta {fmtEstimate(perLap)}</>}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <Button size="sm" variant={paused ? "default" : "outline"} onClick={toggle}>
            {paused ? <><Play className="mr-1 h-3.5 w-3.5" />Retomar</> : <><Pause className="mr-1 h-3.5 w-3.5" />Pausar</>}
          </Button>
          <Button size="sm" variant="outline" onClick={lap} title="Marcar vídeo pronto">
            <Flag className="mr-1 h-3.5 w-3.5" />Volta
          </Button>
          <Button size="sm" onClick={() => stop()}>
            <Square className="mr-1 h-3.5 w-3.5" />Parar
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="mt-2 w-full rounded-md py-1 text-[11px] text-muted-foreground transition hover:text-foreground">
              Anotação, voltas e totais
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-80 space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Anotação da sessão</p>
              <Input
                value={active.notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="O que está sendo feito?"
                className="h-8 text-xs"
              />
            </div>

            {laps.length > 0 && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {laps.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Vídeo {i + 1}</span>
                    <span className="font-mono tabular-nums">{fmtClock(Math.round(l - (laps[i - 1] ?? 0)))}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 rounded-md border border-border p-2 text-center">
              <Stat label="Hoje" value={fmt(summary?.today ?? 0)} />
              <Stat label="7 dias" value={fmt(summary?.week ?? 0)} />
              <Stat label="Sessões" value={String(summary?.sessions ?? 0)} />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full text-destructive"
              onClick={() => { if (confirm("Descartar esta sessão sem registrar o tempo?")) discard(); }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />Descartar sessão
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-xs font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function StartTimerButton(props: {
  videoId?: string;
  taskId?: string;
  batchIds?: string[];
  label: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  showTotal?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { active, elapsed, paused, start, stop, toggle } = useTimer();
  const { data: total } = useVideoTime(props.showTotal ? props.videoId : undefined);
  const running = !!active && (
    (!!props.videoId && active.videoId === props.videoId) ||
    (!!props.taskId && active.taskId === props.taskId)
  );

  if (running) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          size={props.size ?? "sm"}
          variant="outline"
          onClick={toggle}
          className={cn("border-primary/60 text-primary", props.className)}
          title={paused ? "Retomar" : "Pausar"}
        >
          {paused ? <Play className="mr-1 h-3.5 w-3.5" /> : <Pause className="mr-1 h-3.5 w-3.5" />}
          <span className="font-mono tabular-nums">{fmtClock(elapsed)}</span>
        </Button>
        <Button size="icon" variant="ghost" onClick={() => stop()} title="Finalizar" className="h-8 w-8 text-destructive">
          <Square className="h-3.5 w-3.5" />
        </Button>
      </span>
    );
  }

  return (
    <Button
      size={props.size ?? "sm"}
      variant={props.variant ?? "outline"}
      onClick={() => start({ videoId: props.videoId, taskId: props.taskId, label: props.label, batchIds: props.batchIds })}
      className={props.className}
      title="Iniciar cronômetro"
    >
      <Play className="mr-1 h-3.5 w-3.5" />
      {props.compact ? null : "Cronômetro"}
      {props.showTotal && (total ?? 0) > 0 && (
        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground tabular-nums">{fmt(total!)}</span>
      )}
    </Button>
  );
}

/**
 * Cronômetro de leva: fica em cima de um conjunto de vídeos do mesmo cliente.
 * Mostra o mostrador, controles reais e a estimativa para terminar a leva.
 */
export function BatchTimer({ label, videoIds, remaining, className, compact = false }: {
  label: string;
  videoIds: string[];
  /** Quantos vídeos da leva ainda faltam concluir. */
  remaining: number;
  className?: string;
  compact?: boolean;
}) {
  const { active, elapsedMs, laps, paused, start, stop, toggle, lap } = useTimer(true);
  const { data: pace } = useVideoPace(videoIds);
  const running = !!active && !!active.batchIds && active.batchIds.join(",") === videoIds.join(",");
  const liveAvg = running && laps.length > 0 ? Math.round(laps[laps.length - 1] / laps.length) : 0;
  const avg = liveAvg || (pace?.avgPerVideo ?? 0);
  const left = Math.max(0, remaining - (running ? laps.length : 0));
  const eta = avg > 0 ? avg * left : 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs transition",
        running && !paused ? "border-primary/50 bg-primary/5" : "border-border bg-card/40",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <TimerIcon className={cn("h-3.5 w-3.5 shrink-0 text-primary", running && !paused && "animate-pulse")} />
        {running ? (
          <>
            <ClockDisplay ms={elapsedMs} paused={paused} size="md" />
            <div className="ml-auto flex items-center gap-1">
              <button onClick={toggle} className="rounded-md p-1 text-primary hover:bg-primary/15" title={paused ? "Retomar" : "Pausar"}>
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button onClick={lap} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Marcar vídeo pronto">
                <Flag className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => stop()} className="rounded-md p-1 text-destructive hover:bg-destructive/15" title="Finalizar">
                <Square className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => start({ label, batchIds: videoIds, videoId: videoIds[0], notes: `Leva: ${label}` })}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary transition hover:bg-primary/10"
          >
            <Play className="h-3.5 w-3.5" />Cronometrar leva
          </button>
        )}
      </div>

      {!compact && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Gauge className="h-3 w-3 shrink-0" />
          {avg > 0 ? (
            <span>
              {fmtEstimate(avg)}/vídeo · faltam {left} ≈ <b className="font-mono text-foreground">{fmtEstimate(eta)}</b>
            </span>
          ) : (
            <span>Sem histórico ainda — cronometre para o sistema aprender</span>
          )}
        </div>
      )}
    </div>
  );
}
