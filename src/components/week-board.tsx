import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { naturalCompare } from "@/lib/format";
import { STAGE_ACCENT, STAGE_LABEL } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, GripVertical, CalendarOff,
  Plus, X, Maximize2, Minimize2, CheckSquare, Search, AlertTriangle, CalendarDays,
  ArrowLeftRight, Pencil,
} from "lucide-react";
import { sfx } from "@/lib/sfx";

export type WeekCard = {
  id: string;
  title: string;
  status: VideoStatus;
  due_date: string | null;
  color: string | null;
  client_id?: string;
  clients: { name: string } | null;
};

export type WeekPatch = {
  due_date?: string | null;
  status?: VideoStatus;
  client_id?: string;
  title?: string;
};


const DAY_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SHORT_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DONE: VideoStatus[] = ["aprovado", "entregue"];
const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];
const PREFS_KEY = "weekboard:prefs";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7); // segunda
  return d;
}

function addDays(key: string, delta: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return iso(date);
}

type Prefs = { wide: boolean; days: 6 | 7; group: boolean };
const DEFAULT_PREFS: Prefs = { wide: false, days: 6, group: false };

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
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
  onPatch: (ids: string[], changes: WeekPatch) => void;
  onCreate?: (payload: { title: string; client_id: string; due_date: string | null }) => void;
  onOpen?: (id: string) => void;
}) {
  const [week, setWeek] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", client_id: "" });
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const lastClicked = useRef<{ col: string; id: string } | null>(null);
  const today = iso(new Date());

  useEffect(() => setPrefs(loadPrefs()), []);
  const savePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const days = useMemo(() => {
    const s = startOfWeek(week);
    return Array.from({ length: prefs.days }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return { key: iso(d), label: DAY_LABEL[d.getDay()], short: SHORT_LABEL[d.getDay()], num: d.getDate(), month: d.getMonth() + 1 };
    });
  }, [week, prefs.days]);

  const last = days[days.length - 1];
  const range = `${days[0].num}/${String(days[0].month).padStart(2, "0")} – ${last.num}/${String(last.month).padStart(2, "0")}`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((v) => {
      if (hideDone && DONE.includes(v.status)) return false;
      if (clientFilter && (v.clients?.name ?? "") !== clientFilter) return false;
      if (q && !`${v.title} ${v.clients?.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, clientFilter, hideDone]);

  const byDay = useMemo(() => {
    const map = new Map<string, WeekCard[]>();
    days.forEach((d) => map.set(d.key, []));
    map.set("none", []);
    const first = days[0].key;
    const lastKey = last.key;
    filtered.forEach((v) => {
      if (!v.due_date) { map.get("none")!.push(v); return; }
      if (v.due_date < first) { map.get(first)!.push(v); return; } // atrasados caem na segunda
      if (v.due_date > lastKey) return;
      const bucket = map.get(v.due_date);
      if (bucket) bucket.push(v);
    });
    map.forEach((list, key) => {
      list.sort((a, b) => {
        if (prefs.group) {
          const c = naturalCompare(a.clients?.name, b.clients?.name);
          if (c !== 0) return c;
        }
        return naturalCompare(a.title, b.title);
      });
      map.set(key, list);
    });
    return map;
  }, [filtered, days, last.key, prefs.group]);

  // Limpa seleção de itens que saíram da visão.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const alive = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const shift = useCallback((delta: number) => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const targets = new Map<string, string[]>();
    items.forEach((v) => {
      if (!ids.includes(v.id) || !v.due_date) return;
      const t = addDays(v.due_date, delta);
      const arr = targets.get(t) ?? [];
      arr.push(v.id);
      targets.set(t, arr);
    });
    if (targets.size === 0) return;
    sfx.success();
    targets.forEach((list, date) => onPatch(list, { due_date: date }));
  }, [selected, items, onPatch]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /input|textarea|select/i.test(el.tagName)) return;
      if (e.key === "Escape") { setSelected(new Set()); setAdding(null); }
      if (selected.size > 0 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        shift(e.key === "ArrowRight" ? 1 : -1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, shift]);

  function clickCard(e: React.MouseEvent, colId: string, id: string, list: WeekCard[]) {
    if (e.shiftKey && lastClicked.current?.col === colId) {
      const from = list.findIndex((v) => v.id === lastClicked.current!.id);
      const to = list.findIndex((v) => v.id === id);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        setSelected((prev) => {
          const next = new Set(prev);
          list.slice(a, b + 1).forEach((v) => next.add(v.id));
          return next;
        });
        sfx.open();
        return;
      }
    }
    lastClicked.current = { col: colId, id };
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

  function bulk(changes: { due_date?: string | null; status?: VideoStatus }, keep = false) {
    if (selected.size === 0) return;
    sfx.success();
    onPatch([...selected], changes);
    if (!keep) setSelected(new Set());
  }

  function submitDraft(dayKey: string) {
    const title = draft.title.trim();
    if (!title || !draft.client_id || !onCreate) return;
    onCreate({ title, client_id: draft.client_id, due_date: dayKey === "none" ? null : dayKey });
    setDraft((d) => ({ ...d, title: "" }));
  }

  const columns = [...days.map((d) => ({ ...d, id: d.key })), { id: "none", key: "none", label: "Sem prazo", short: "—", num: 0, month: 0 }];
  const clientNames = useMemo(
    () => [...new Set(items.map((v) => v.clients?.name).filter(Boolean) as string[])].sort(naturalCompare),
    [items],
  );
  const totalVisible = filtered.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border/70 bg-card/50 p-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setWeek((w) => w - 1)} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-28 text-center text-xs font-medium tabular-nums text-muted-foreground">{range}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setWeek((w) => w + 1)} aria-label="Próxima semana">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {week !== 0 && (
          <Button size="sm" variant="ghost" className="h-8 rounded-full text-[11px]" onClick={() => setWeek(0)}>Esta semana</Button>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="h-8 w-40 rounded-full pl-8 text-xs"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-8 rounded-full border border-border bg-background px-3 text-xs"
        >
          <option value="">Todos os clientes</option>
          {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        <Button size="sm" variant={hideDone ? "default" : "outline"} className="h-8 rounded-full text-[11px]" onClick={() => setHideDone((v) => !v)}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Ocultar prontos
        </Button>
        <Button size="sm" variant={prefs.group ? "default" : "outline"} className="h-8 rounded-full text-[11px]" onClick={() => savePrefs({ group: !prefs.group })}>
          Agrupar por cliente
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-full text-[11px]" onClick={() => savePrefs({ days: prefs.days === 6 ? 7 : 6 })} title="Incluir domingo">
          <CalendarDays className="mr-1 h-3.5 w-3.5" />{prefs.days === 6 ? "6 dias" : "7 dias"}
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-full text-[11px]" onClick={() => savePrefs({ wide: !prefs.wide })} title="Largura das colunas">
          {prefs.wide ? <Minimize2 className="mr-1 h-3.5 w-3.5" /> : <Maximize2 className="mr-1 h-3.5 w-3.5" />}
          {prefs.wide ? "Compacto" : "Amplo"}
        </Button>
        <span className="ml-auto hidden text-[11px] text-muted-foreground lg:block">
          {totalVisible} vídeo{totalVisible === 1 ? "" : "s"} · clique/shift para selecionar · ← → move o prazo
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
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-1">
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => shift(-1)}>-1 dia</Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => shift(1)}>+1 dia</Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => shift(7)}>+1 sem</Button>
          </div>
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
          const doneCount = list.filter((v) => DONE.includes(v.status)).length;
          const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
          const allSelected = list.length > 0 && list.every((v) => selected.has(v.id));
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); drop(col.id); }}
              className={cn(
                "flex max-h-[70vh] shrink-0 snap-start flex-col rounded-2xl border p-2.5 transition",
                prefs.wide ? "w-[320px]" : "w-[248px]",
                active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border/70 bg-card/40",
                isToday && !active && "border-primary/40 bg-primary/[0.03]",
              )}
            >
              <div className="mb-2 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {col.id === "none" && <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{col.label}</span>
                    {col.id !== "none" && (
                      <span className="text-[10px] tabular-nums text-muted-foreground">{col.num}/{String(col.month).padStart(2, "0")}</span>
                    )}
                    {isToday && <span className="rounded-full bg-primary/15 px-1.5 text-[9px] font-semibold text-primary">hoje</span>}
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
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/50">
                  <div className="h-full rounded-full bg-[oklch(0.68_0.17_155)] transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="-mr-1 flex-1 space-y-2 overflow-y-auto pr-1">
                {list.map((v, vi) => {
                  const done = DONE.includes(v.status);
                  const isSel = selected.has(v.id);
                  const late = !!v.due_date && v.due_date < today && !done;
                  const cname = v.clients?.name ?? "—";
                  const showGroup = prefs.group && (vi === 0 || (list[vi - 1].clients?.name ?? "—") !== cname);
                  const groupItems = prefs.group ? list.filter((x) => (x.clients?.name ?? "—") === cname) : [];
                  const groupAllSel = groupItems.length > 0 && groupItems.every((x) => selected.has(x.id));
                  return (
                    <div key={v.id} className={cn(showGroup && vi > 0 && "pt-1.5")}>
                    {showGroup && (
                      <button
                        onClick={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            groupItems.forEach((x) => (groupAllSel ? next.delete(x.id) : next.add(x.id)));
                            return next;
                          });
                          sfx.open();
                        }}
                        className={cn(
                          "mb-1 flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-muted/50 hover:text-foreground",
                          groupAllSel && "text-primary",
                        )}
                        title="Selecionar todos deste cliente"
                      >
                        <span className="truncate">{cname}</span>
                        <span className="ml-auto rounded-full bg-muted/60 px-1.5 tabular-nums">{groupItems.length}</span>
                      </button>
                    )}
                    <div

                      key={v.id}
                      draggable
                      onDragStart={(e) => { setDragId(v.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", v.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onClick={(e) => {
                        if (e.detail > 1) return;
                        clickCard(e, col.id, v.id, list);
                      }}
                      onDoubleClick={() => onOpen?.(v.id)}
                      className={cn(
                        "group cursor-grab rounded-xl border bg-card p-2.5 transition active:cursor-grabbing hover:border-primary/40 hover:shadow-sm",
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
                            {late && (
                              <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full bg-destructive/10 px-1 text-[9px] font-semibold text-destructive">
                                <AlertTriangle className="h-2.5 w-2.5" />atrasado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <QuickEdit
                            card={v}
                            clients={clients}
                            columns={columns}
                            onPatch={(changes) => onPatch([v.id], changes)}
                          />
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                        </div>
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

/** Edição rápida do cartão: título, cliente, situação e prazo — tudo no próprio quadro. */
function QuickEdit({
  card,
  clients,
  columns,
  onPatch,
}: {
  card: WeekCard;
  clients: { id: string; name: string }[];
  columns: { id: string; label: string; num: number; month: number }[];
  onPatch: (changes: WeekPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [date, setDate] = useState(card.due_date ?? "");

  useEffect(() => {
    if (open) { setTitle(card.title); setDate(card.due_date ?? ""); }
  }, [open, card.title, card.due_date]);

  function apply(changes: WeekPatch, close = true) {
    sfx.success();
    onPatch(changes);
    if (close) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="mt-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
          aria-label="Editar cartão"
          title="Edição rápida"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edição rápida</p>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim() && title !== card.title) apply({ title: title.trim() });
          }}
          onBlur={() => { if (title.trim() && title !== card.title) apply({ title: title.trim() }, false); }}
          className="h-8 text-xs"
          placeholder="Título"
        />

        {clients.length > 0 && (
          <select
            value={card.client_id ?? ""}
            onChange={(e) => apply({ client_id: e.target.value }, false)}
            className="mt-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">Cliente…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <div className="mt-2 border-t border-border pt-2">
          <p className="px-1 pb-1 text-[10px] text-muted-foreground">Situação</p>
          <div className="flex flex-wrap gap-1">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => apply({ status: s }, false)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition hover:bg-muted",
                  s === card.status ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[s] }} />
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          <p className="px-1 text-[10px] text-muted-foreground">Prazo</p>
          <div className="flex flex-wrap gap-1">
            {columns.filter((c) => c.id !== "none").map((c) => (
              <button
                key={c.id}
                onClick={() => { setDate(c.id); apply({ due_date: c.id }, false); }}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] tabular-nums transition hover:bg-muted",
                  card.due_date === c.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground",
                )}
              >
                {c.label.slice(0, 3)} {c.num}/{String(c.month).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); apply({ due_date: e.target.value || null }, false); }}
              className="h-8 flex-1 text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              title="Remover prazo"
              onClick={() => { setDate(""); apply({ due_date: null }, false); }}
            >
              <CalendarOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Button size="sm" className="mt-2 h-7 w-full text-[11px]" onClick={() => setOpen(false)}>Fechar</Button>
      </PopoverContent>
    </Popover>
  );
}
