import { useTimer, fmt } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Play, Square, Timer as TimerIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TimerBadge() {
  const { active, elapsed, stop } = useTimer();
  if (!active) return null;
  return (
    <div className="fixed bottom-6 right-24 z-40 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur">
      <TimerIcon className="h-3.5 w-3.5 text-primary animate-pulse" />
      <span className="font-mono text-xs tabular-nums">{fmt(elapsed)}</span>
      {active.videoId ? (
        <Link to="/workflow" className="max-w-[140px] truncate text-[11px] text-muted-foreground hover:text-foreground">
          {active.label}
        </Link>
      ) : (
        <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">{active.label}</span>
      )}
      <button
        onClick={() => stop()}
        className="rounded-full bg-destructive/15 p-1 text-destructive hover:bg-destructive/25"
        title="Finalizar"
      >
        <Square className="h-3 w-3" />
      </button>
    </div>
  );
}

export function StartTimerButton(props: {
  videoId?: string;
  taskId?: string;
  label: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
}) {
  const { active, start, stop } = useTimer();
  const running = active && (active.videoId === props.videoId || active.taskId === props.taskId);
  if (running) {
    return (
      <Button size={props.size ?? "sm"} variant="outline" onClick={() => stop()}>
        <Square className="mr-1 h-3.5 w-3.5" />Parar
      </Button>
    );
  }
  return (
    <Button size={props.size ?? "sm"} variant={props.variant ?? "outline"} onClick={() => start({ videoId: props.videoId, taskId: props.taskId, label: props.label })}>
      <Play className="mr-1 h-3.5 w-3.5" />Cronômetro
    </Button>
  );
}
