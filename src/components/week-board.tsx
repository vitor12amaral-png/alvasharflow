import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { naturalCompare } from "@/lib/format";
import { STAGE_ACCENT, STAGE_LABEL } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, GripVertical, CalendarOff,
  Plus, X, Maximize2, Minimize2, CheckSquare,
} from "lucide-react";
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
const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];

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
 * Arraste cartões (um ou vários selecionados) para outro dia para mudar o prazo.
 */
export function WeekBoard({
  items,
  clients = [],
  onPatch,
  onCreate,
  onOpen,
}: {
  items: WeekCard[];
  clients?: { id: string; name: string }[];
  onPatch: (ids: string[], changes: { due_date?: string | null; status?: VideoStatus }) => void;
  onCreate?: (payload: { title: string; client_id: string; due_date: string | null }) => void;
  onOpen?: (id: string) => void;
}) {
  const [week, setWeek] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wide, setWide] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", client_id: "" });
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

  // Limpa seleção de itens que saíram da visão.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const alive = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setSelected(new Set()); setAdding(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    sfx.open();
  }

  function drop(key: string) {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id) return;
    const target = key === "none" ? null : key;
    const ids = selected.has(id) ? [...selected] : [id];
    const moving = items.filter((v) => ids.includes(v.id) && v.due_date !== target).map((v) => v.id);
    if (moving.length === 0) return;
    sfx.success();
    onPatch(moving, { due_date: target });
  }

  function bulk(changes: { due_date?: string | null; status?: VideoStatus }) {
    if (selected.size === 0) return;
    sfx.success();
    onPatch([...selected], changes);
    setSelected(new Set());
  }

  function submitDraft(dayKey: string) {
    const title = draft.title.trim();
    if (!title || !draft.client_id || !onCreate) return;
    onCreate({ title, client_id: draft.client_id, due_date: dayKey === "none" ? null : dayKey });
    setDraft((d) => ({ ...d, title: "" }));
  }

  const columns = [...days.map((d) => ({ ...d, id: d.key })), { id: "none", key: "none", label: "Sem prazo", num: 0, month: 0 }];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full text-[11px]"
          onClick={() => setWide((w) => !w)}
          title="Largura das colunas"
        >
          {wide ? <Minimize2 className="mr-1 h-3.5 w-3.5" /> : <Maximize2 className="mr-1 h-3.5 w-3.5" />}
          {wide ? "Compacto" : "Amplo"}
        </Button>
        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
          Clique para selecionar · arraste para mudar o prazo
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-xs font-semibold text-primary">{selected.size} selecionado{selected.size > 1 ? "s" : ""}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[11px]">Situação</Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => bulk({ status: s })}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[s] }} />
                  {STAGE_LABEL[s]}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[11px]">Mover para…</Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1">
              {columns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => bulk({ due_date: c.id === "none" ? null : c.id })}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <span>{c.label}</span>
                  {c.id !== "none" && <span className="tabular-nums text-muted-foreground">{c.num}/{String(c.month).padStart(2, "0")}</span>}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulk({ status: "entregue" })}>
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Concluir
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-[11px]" onClick={() => setSelected(new Set())}>
            <X className="mr-1 h-3.5 w-3.5" />Limpar
          </Button>
        </div>
      )}

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {columns.map((col) => {
          const list = byDay.get(col.id) ?? [];
          const isToday = col.id === today;
          const active = over === col.id;
          const allSelected = list.length > 0 && list.every((v) => selected.has(v.id));
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); drop(col.id); }}
              className={cn(
                "shrink-0 snap-start rounded-2xl border p-2.5 transition",
                wide ? "w-[320px]" : "w-[240px]",
                active ? "border-primary bg-primary/5" : "border-border/70 bg-card/40",
                isToday && !active && "border-primary/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  {col.id === "none" && <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{col.label}</span>
                  {col.id !== "none" && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">{col.num}/{String(col.month).padStart(2, "0")}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {list.length > 0 && (
                    <button
                      onClick={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          list.forEach((v) => (allSelected ? next.delete(v.id) : next.add(v.id)));
                          return next;
                        });
                        sfx.open();
                      }}
                      className={cn("rounded p-0.5 text-muted-foreground transition hover:text-foreground", allSelected && "text-primary")}
                      aria-label="Selecionar coluna"
                      title="Selecionar todos do dia"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="rounded-full bg-muted/60 px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{list.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                {list.map((v) => {
                  const done = DONE.includes(v.status);
                  const isSel = selected.has(v.id);
                  return (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={(e) => { setDragId(v.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", v.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onClick={(e) => {
                        if (e.detail > 1) return;
                        toggle(v.id);
                      }}
                      onDoubleClick={() => onOpen?.(v.id)}
                      className={cn(
                        "group cursor-grab rounded-xl border bg-card p-2.5 transition active:cursor-grabbing hover:border-primary/40",
                        isSel ? "border-primary ring-1 ring-primary/40" : "border-border/70",
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

                {onCreate && (adding === col.id ? (
                  <div className="space-y-1.5 rounded-xl border border-primary/40 bg-card p-2">
                    <Input
                      autoFocus
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); submitDraft(col.id); }
                        if (e.key === "Escape") setAdding(null);
                      }}
                      placeholder="Título do vídeo…"
                      className="h-7 text-xs"
                    />
                    <select
                      value={draft.client_id}
                      onChange={(e) => setDraft({ ...draft, client_id: e.target.value })}
                      className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="">Cliente…</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" className="h-7 flex-1 text-[11px]" disabled={!draft.title.trim() || !draft.client_id} onClick={() => submitDraft(col.id)}>
                        Adicionar
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAdding(null)} aria-label="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAdding(col.id); sfx.open(); }}
                    className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />Adicionar vídeo
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
