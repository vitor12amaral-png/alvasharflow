import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CalendarClock, Sun, Sunrise, CalendarDays, CalendarRange, X, Check } from "lucide-react";

export function isoDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next Monday (or today if today is Monday). */
function nextMonday() {
  const d = new Date();
  const diff = (8 - d.getDay()) % 7 || 7;
  return isoDay(diff);
}

export function formatDue(due: string | null, time?: string | null) {
  if (!due) return null;
  const [y, m, d] = due.split("-");
  const base = `${d}/${m}`;
  const t = time ? time.slice(0, 5) : null;
  return t ? `${base} ${t}` : base;
}

export type DueTarget = "videos" | "tasks";

/**
 * Trello-style quick deadline editor. Works for one id or a batch of ids.
 */
export function DueDatePopover({
  table,
  ids,
  due,
  time,
  invalidate,
  children,
  align = "start",
  onDone,
}: {
  table: DueTarget;
  ids: string[];
  due?: string | null;
  time?: string | null;
  invalidate: string[][];
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(due ?? "");
  const [hour, setHour] = useState(time ? time.slice(0, 5) : "");
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async (changes: { due_date: string | null; due_time: string | null }) => {
      const { error } = await supabase.from(table).update(changes).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, changes) => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success(
        changes.due_date
          ? `Prazo definido para ${formatDue(changes.due_date, changes.due_time)}`
          : "Prazo removido",
      );
      setOpen(false);
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function quick(d: string) {
    setDate(d);
    save.mutate({ due_date: d, due_time: hour ? `${hour}:00` : null });
  }

  const presets: { label: string; icon: React.ReactNode; day: string }[] = [
    { label: "Hoje", icon: <Sun className="h-3.5 w-3.5" />, day: isoDay(0) },
    { label: "Amanhã", icon: <Sunrise className="h-3.5 w-3.5" />, day: isoDay(1) },
    { label: "Em 3 dias", icon: <CalendarDays className="h-3.5 w-3.5" />, day: isoDay(3) },
    { label: "Próxima segunda", icon: <CalendarRange className="h-3.5 w-3.5" />, day: nextMonday() },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-2">
        <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {ids.length > 1 ? `Prazo de ${ids.length} vídeos` : "Prazo"}
        </p>

        <div className="space-y-0.5">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => quick(p.day)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition hover:bg-muted",
                date === p.day && "bg-muted text-primary",
              )}
            >
              {p.icon}
              {p.label}
              <span className="ml-auto text-[10px] text-muted-foreground">{p.day.slice(8)}/{p.day.slice(5, 7)}</span>
            </button>
          ))}
        </div>

        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Horário</Label>
              <Input type="time" value={hour} onChange={(e) => setHour(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              disabled={!date || save.isPending}
              onClick={() => save.mutate({ due_date: date || null, due_time: hour ? `${hour}:00` : null })}
            >
              <Check className="mr-1 h-3 w-3" />Aplicar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => { setDate(""); setHour(""); save.mutate({ due_date: null, due_time: null }); }}
            >
              <X className="mr-1 h-3 w-3" />Limpar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DueBadge({ due, time, className, muted }: { due: string | null; time?: string | null; className?: string; muted?: boolean }) {
  const today = isoDay(0);
  const late = !muted && !!due && due < today;
  const isToday = !muted && due === today;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition",
        late
          ? "bg-destructive/15 text-destructive"
          : isToday
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      <CalendarClock className="h-3 w-3" />
      {due ? formatDue(due, time) : "prazo"}
    </span>
  );
}
