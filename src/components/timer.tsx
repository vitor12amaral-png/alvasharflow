import { useTimer, useTimeSummary, useVideoTime, useVideoPace, fmt, fmtClock, fmtEstimate } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Pause, Square, Timer as TimerIcon, Trash2, ChevronUp, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pílula flutuante com o cronômetro em andamento (usada só no Workflow). */
export function TimerBadge() {
  const { active, elapsed, paused, stop, discard, toggle, setNotes } = useTimer();
  const { data: summary } = useTimeSummary();
  if (!active) return null;

  return (
    <div className="fixed bottom-6 right-24 z-40">
      <Popover>
        <div className={cn(
          "flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur transition",
          paused ? "border-border" : "border-primary/50",
        )}>
          <TimerIcon className={cn("h-3.5 w-3.5 text-primary", !paused && "animate-pulse")} />
          <span className="font-mono text-xs tabular-nums">{fmtClock(elapsed)}</span>
          <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">{active.label}</span>
          <button
            onClick={toggle}
            className="rounded-full bg-primary/15 p-1 text-primary hover:bg-primary/25"
            title={paused ? "Retomar" : "Pausar"}
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </button>
          <button
            onClick={() => stop()}
            className="rounded-full bg-destructive/15 p-1 text-destructive hover:bg-destructive/25"
            title="Finalizar e registrar"
          >
            <Square className="h-3 w-3" />
          </button>
          <PopoverTrigger asChild>
            <button className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Detalhes">
              <ChevronUp className="h-3 w-3" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent align="end" side="top" className="w-80 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {paused ? "Pausado" : "Em andamento"}
            </p>
            <p className="truncate text-sm font-medium">{active.label}</p>
            <p className="font-mono text-3xl font-semibold tabular-nums">{fmtClock(elapsed)}</p>
            {active.batchIds && active.batchIds.length > 1 && (
              <p className="text-[11px] text-muted-foreground">
                Leva com {active.batchIds.length} vídeos · {fmtEstimate(Math.round(elapsed / active.batchIds.length))} por vídeo até agora
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Anotação da sessão</p>
            <Input
              value={active.notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que está sendo feito?"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md border border-border p-2 text-center">
            <Stat label="Hoje" value={fmt(summary?.today ?? 0)} />
            <Stat label="7 dias" value={fmt(summary?.week ?? 0)} />
            <Stat label="Sessões" value={String(summary?.sessions ?? 0)} />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={toggle}>
              {paused ? <><Play className="mr-1 h-3.5 w-3.5" />Retomar</> : <><Pause className="mr-1 h-3.5 w-3.5" />Pausar</>}
            </Button>
            <Button size="sm" className="flex-1" onClick={() => stop()}>
              <Square className="mr-1 h-3.5 w-3.5" />Finalizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (confirm("Descartar esta sessão sem registrar o tempo?")) discard(); }}
              title="Descartar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
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
 * Mostra tempo da sessão, ritmo e estimativa para terminar a leva.
 */
export function BatchTimer({ label, videoIds, remaining, className }: {
  label: string;
  videoIds: string[];
  /** Quantos vídeos da leva ainda faltam concluir. */
  remaining: number;
  className?: string;
}) {
  const { active, elapsed, paused, start, stop, toggle } = useTimer();
  const { data: pace } = useVideoPace(videoIds);
  const running = !!active && !!active.batchIds && active.batchIds.join(",") === videoIds.join(",");
  const avg = pace?.avgPerVideo ?? 0;
  const eta = avg > 0 ? avg * remaining : 0;

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition",
      running && !paused ? "border-primary/50 bg-primary/5" : "border-border bg-card/40",
      className,
    )}>
      <TimerIcon className={cn("h-3.5 w-3.5 shrink-0 text-primary", running && !paused && "animate-pulse")} />
      {running ? (
        <>
          <span className="font-mono text-sm font-semibold tabular-nums">{fmtClock(elapsed)}</span>
          <button onClick={toggle} className="rounded-md p-1 text-primary hover:bg-primary/15" title={paused ? "Retomar" : "Pausar"}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => stop()} className="rounded-md p-1 text-destructive hover:bg-destructive/15" title="Finalizar">
            <Square className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <button
          onClick={() => start({ label, batchIds: videoIds, videoId: videoIds[0], notes: `Leva: ${label}` })}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10"
        >
          <Play className="h-3.5 w-3.5" />Cronometrar leva
        </button>
      )}
      <span className="ml-auto flex items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground">
        <Gauge className="h-3 w-3" />
        {avg > 0 ? <>{fmtEstimate(avg)}/vídeo · faltam ≈ {fmtEstimate(eta)}</> : "Sem histórico ainda"}
      </span>
    </div>
  );
}
