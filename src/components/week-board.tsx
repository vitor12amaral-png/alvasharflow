import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { naturalCompare } from "@/lib/format";
import { STAGE_ACCENT, STAGE_LABEL } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, GripVertical, CalendarOff } from "lucide-react";
import { sfx } from "@/lib/sfx";

export type WeekCard = {
  id: string;
  title: string;
  status: VideoStatus;
  due_date: string | null;
  color: string | null;
  clients: { name: string } | null;
};

const DAY_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DONE: VideoStatus[] = ["aprovado", "entregue"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7); // segunda
  return d;
}

/**
 * Quadro semanal estilo Trello: colunas por dia da semana.
 * Arraste um cartão para outro dia para mudar o prazo — sem abrir diálogos.
 */
export function WeekBoard({
  items,
  onPatch,
  onOpen,
}: {
  items: WeekCard[];
  onPatch: (ids: string[], changes: { due_date?: string | null; status?: VideoStatus }) => void;
  onOpen?: (id: string) => void;
}) {
  const [week, setWeek] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const today = iso(new Date());

  const days = useMemo(() => {
    const s = startOfWeek(week);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return { key: iso(d), label: DAY_LABEL[d.getDay()], num: d.getDate(), month: d.getMonth() + 1 };
    });
  }, [week]);

  const range = `${days[0].num}/${String(days[0].month).padStart(2, "0")} – ${days[5].num}/${String(days[5].month).padStart(2, "0")}`;

  const byDay = useMemo(() => {
    const map = new Map<string, WeekCard[]>();
    days.forEach((d) => map.set(d.key, []));
    map.set("none", []);
    const first = days[0].key;
    const last = days[5].key;
    items.forEach((v) => {
      if (!v.due_date) { map.get("none")!.push(v); return; }
      if (v.due_date < first) { map.get(first)!.push(v); return; } // atrasados caem na segunda
      if (v.due_date > last) return;
      const bucket = map.get(v.due_date);
      if (bucket) bucket.push(v);
    });
    map.forEach((list) => list.sort((a, b) => naturalCompare(a.title, b.title)));
    return map;
  }, [items, days]);

  function drop(key: string) {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id) return;
    const v = items.find((x) => x.id === id);
    const target = key === "none" ? null : key;
    if (!v || v.due_date === target) return;
    sfx.success();
    onPatch([id], { due_date: target });
  }

  const columns = [...days.map((d) => ({ ...d, id: d.key })), { id: "none", key: "none", label: "Sem prazo", num: 0, month: 0 }];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setWeek((w) => w - 1)} aria-label="Semana anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-32 text-center text-xs font-medium tabular-nums text-muted-foreground">{range}</span>
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setWeek((w) => w + 1)} aria-label="Próxima semana">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {week !== 0 && (
          <Button size="sm" variant="ghost" className="h-8 rounded-full text-[11px]" onClick={() => setWeek(0)}>Esta semana</Button>
        )}
        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">Arraste os cartões entre os dias para mudar o prazo</span>
      </div>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {columns.map((col) => {
          const list = byDay.get(col.id) ?? [];
          const isToday = col.id === today;
          const active = over === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); drop(col.id); }}
              className={cn(
                "w-[240px] shrink-0 snap-start rounded-2xl border p-2.5 transition",
                active ? "border-primary bg-primary/5" : "border-border/70 bg-card/40",
                isToday && !active && "border-primary/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  {col.id === "none" && <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{col.label}</span>
                  {col.id !== "none" && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">{col.num}/{String(col.month).padStart(2, "0")}</span>
                  )}
                </div>
                <span className="rounded-full bg-muted/60 px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{list.length}</span>
              </div>

              <div className="space-y-2">
                {list.map((v) => {
                  const done = DONE.includes(v.status);
                  return (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={(e) => { setDragId(v.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", v.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onClick={() => onOpen?.(v.id)}
                      className={cn(
                        "group cursor-grab rounded-xl border border-border/70 bg-card p-2.5 transition active:cursor-grabbing hover:border-primary/40",
                        dragId === v.id && "opacity-40",
                      )}
                      style={v.color ? { borderLeft: `3px solid ${v.color}` } : undefined}
                    >
                      <div className="flex items-start gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); sfx.success(); onPatch([v.id], { status: done ? "editando" : "entregue" }); }}
                          className="mt-0.5 shrink-0"
                          aria-label={done ? "Reabrir" : "Concluir"}
                        >
                          {done
                            ? <CheckCircle2 className="h-4 w-4 text-[oklch(0.68_0.17_155)]" />
                            : <Circle className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-xs font-medium", done && "text-muted-foreground line-through")}>{v.title}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[v.status] }} />
                            <span className="truncate text-[10px] text-muted-foreground">
                              {v.clients?.name ?? "—"} · {STAGE_LABEL[v.status]}
                            </span>
                          </div>
                        </div>
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border/70 px-2 py-6 text-center text-[10px] text-muted-foreground">
                    solte aqui
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
