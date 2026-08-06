import { useTimer, useTimeSummary, useVideoTime, fmt } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Square, Timer as TimerIcon, Trash2, ChevronUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function TimerBadge() {
  const { active, elapsed, stop, discard, setNotes } = useTimer();
  const { data: summary } = useTimeSummary();
  if (!active) return null;

  return (
    <div className="fixed bottom-6 right-24 z-40">
      <Popover>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur">
          <TimerIcon className="h-3.5 w-3.5 animate-pulse text-primary" />
          <span className="font-mono text-xs tabular-nums">{fmt(elapsed)}</span>
          {active.videoId ? (
            <Link to="/workflow" search={{ month: undefined }} className="max-w-[140px] truncate text-[11px] text-muted-foreground hover:text-foreground">
              {active.label}
            </Link>
          ) : (
            <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">{active.label}</span>
          )}
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

        <PopoverContent align="end" side="top" className="w-72 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em andamento</p>
            <p className="truncate text-sm font-medium">{active.label}</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{fmt(elapsed)}</p>
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
  label: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  showTotal?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { active, elapsed, start, stop } = useTimer();
  const { data: total } = useVideoTime(props.showTotal ? props.videoId : undefined);
  const running = !!active && (
    (!!props.videoId && active.videoId === props.videoId) ||
    (!!props.taskId && active.taskId === props.taskId)
  );

  if (running) {
    return (
      <Button
        size={props.size ?? "sm"}
        variant="outline"
        onClick={() => stop()}
        className={cn("border-primary/60 text-primary", props.className)}
        title="Finalizar cronômetro"
      >
        <Square className="mr-1 h-3.5 w-3.5" />
        <span className="font-mono tabular-nums">{fmt(elapsed)}</span>
      </Button>
    );
  }

  return (
    <Button
      size={props.size ?? "sm"}
      variant={props.variant ?? "outline"}
      onClick={() => start({ videoId: props.videoId, taskId: props.taskId, label: props.label })}
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
