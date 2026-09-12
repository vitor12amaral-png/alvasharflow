import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx";
import { useTimer } from "@/hooks/use-timer";
import { STAGE_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { colorValue } from "@/components/color-tag";
import { formatDue, isoDay } from "@/components/due-date-popover";
import {
  Play, Check, Sun, AlarmClock, Timer, Sparkles, ArrowRight, CalendarPlus,
  Loader2, Inbox, Search, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/meu-dia")({
  beforeLoad: () => {
    throw redirect({ to: "/workflow", search: { view: "kanban", client: undefined, month: undefined, video: undefined, new: undefined } });
  },
  component: MyDayPage,
  head: () => ({
    meta: [
      { title: "Meu dia — AlvasharFlow" },
      { name: "description", content: "A lista do que editar agora, montada automaticamente por prazo e prioridade." },
      { property: "og:title", content: "Meu dia — AlvasharFlow" },
      { property: "og:description", content: "Veja o que precisa ser feito hoje e comece a editar em um clique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  id: string;
  title: string;
  status: VideoStatus;
  priority: VideoPriority;
  due_date: string | null;
  due_time: string | null;
  estimated_hours: number | null;
  color: string | null;
  client_id: string;
  clients: { name: string } | null;
};

const DONE: VideoStatus[] = ["aprovado", "entregue"];
const WEIGHT: Record<VideoPriority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
const SUGGEST_LIMIT = 6;

function hoursLabel(h: number) {
  if (!h) return "—";
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return hh ? `${hh}h${mm ? String(mm).padStart(2, "0") : ""}` : `${mm}min`;
}

function MyDayPage() {
  const today = isoDay(0);
  const tomorrow = isoDay(1);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const timer = useTimer();
  const [q, setQ] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["my-day"],
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, status, priority, due_date, due_time, estimated_hours, color, client_id, clients(name)")
        .not("status", "in", `(${DONE.join(",")})`)
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ ids, changes }: { ids: string[]; changes: { due_date?: string | null; status?: VideoStatus } }) => {
      const { error } = await supabase.from("videos").update(changes).in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, changes }) => {
      await qc.cancelQueries({ queryKey: ["my-day"] });
      const prev = qc.getQueryData<Row[]>(["my-day"]);
      qc.setQueryData<Row[]>(["my-day"], (old) => (old ?? []).map((r) => (ids.includes(r.id) ? { ...r, ...changes } : r)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["my-day"], ctx?.prev);
      sfx.error();
      toast.error("Não deu para salvar. Tente de novo.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-day"] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const term = q.trim().toLowerCase();
  const match = (r: Row) => !term || r.title.toLowerCase().includes(term) || (r.clients?.name ?? "").toLowerCase().includes(term);

  const sortRows = (a: Row, b: Row) => {
    const da = a.due_date ?? "9999-12-31";
    const db = b.due_date ?? "9999-12-31";
    if (da !== db) return da.localeCompare(db);
    return WEIGHT[a.priority] - WEIGHT[b.priority];
  };

  const { day, suggested, late } = useMemo(() => {
    const all = (rows ?? []).filter(match);
    const inDay = all.filter((r) => r.due_date && r.due_date <= today).sort(sortRows);
    const rest = all
      .filter((r) => !r.due_date || r.due_date > today)
      .sort((a, b) => {
        const p = WEIGHT[a.priority] - WEIGHT[b.priority];
        if (p) return p;
        return (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
      })
      .slice(0, SUGGEST_LIMIT);
    return { day: inDay, suggested: rest, late: inDay.filter((r) => r.due_date! < today) };
  }, [rows, term, today]);

  const estimated = day.reduce((sum, r) => sum + Number(r.estimated_hours ?? 0), 0);

  function addToDay(ids: string[]) {
    if (!ids.length) return;
    sfx.success();
    patch.mutate({ ids, changes: { due_date: today } });
  }

  function startEditing(r: Row) {
    if (r.status !== "editando") patch.mutate({ ids: [r.id], changes: { status: "editando" } });
    void timer.start({ videoId: r.id, label: `${r.clients?.name ?? "—"} · ${r.title}` });
  }

  function finish(r: Row) {
    sfx.success();
    patch.mutate({ ids: [r.id], changes: { status: "revisao" } });
  }

  function openVideo(r: Row) {
    navigate({ to: "/workflow", search: { client: "all", view: "kanban", video: r.id, month: undefined, new: undefined } });
  }

  return (
    <div className="flex flex-col px-6 pb-24 pt-6 md:px-8 md:pt-8">
      <PageHeader
        title="Meu dia"
        subtitle={
          day.length
            ? `${day.length} demanda${day.length > 1 ? "s" : ""} para hoje${estimated ? ` · ${hoursLabel(estimated)} estimadas` : ""}`
            : "Nada marcado para hoje — escolha abaixo o que entra na sua lista"
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-9 w-44 pl-8 text-xs" />
            </div>
            <Button variant="outline" asChild>
              <Link to="/workflow" search={{ client: "all", view: "kanban", month: undefined, video: undefined, new: undefined }}>
                Abrir quadro<ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        <Kpi Icon={Sun} value={day.length} label="Para hoje" tone="text-primary" />
        <Kpi Icon={AlarmClock} value={late.length} label="Atrasadas" tone={late.length ? "text-destructive" : "text-muted-foreground"} />
        <Kpi Icon={Timer} value={hoursLabel(estimated)} label="Tempo estimado" tone="text-muted-foreground" />
        <Kpi Icon={Inbox} value={(rows ?? []).length} label="Demandas abertas" tone="text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fila de hoje</h2>
            {day.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">Sua lista de hoje está vazia.</p>
                {suggested.length > 0 && (
                  <Button className="mt-3" onClick={() => addToDay(suggested.map((r) => r.id))}>
                    <Sparkles className="mr-1 h-4 w-4" />Montar meu dia com {suggested.length} demandas
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {day.map((r) => (
                  <DayRow
                    key={r.id}
                    row={r}
                    today={today}
                    running={timer.active?.videoId === r.id}
                    onStart={() => startEditing(r)}
                    onFinish={() => finish(r)}
                    onPostpone={() => patch.mutate({ ids: [r.id], changes: { due_date: tomorrow } })}
                    onOpen={() => openVideo(r)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sugeridas para hoje</h2>
              {suggested.length > 0 && (
                <button
                  onClick={() => addToDay(suggested.map((r) => r.id))}
                  className="text-[11px] font-medium text-primary transition hover:underline"
                >
                  Aceitar todas
                </button>
              )}
            </div>
            {suggested.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Sem sugestões — tudo que está aberto já entrou no seu dia.
              </div>
            ) : (
              <div className="space-y-1.5">
                {suggested.map((r) => (
                  <div key={r.id} className="group flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2">
                    <span className="h-6 w-[3px] shrink-0 rounded-full" style={{ background: colorValue(r.color) ?? "transparent" }} />
                    <button onClick={() => openVideo(r)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-medium">{r.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {r.clients?.name ?? "—"} · {STAGE_LABEL[r.status]}
                        {r.due_date ? ` · ${formatDue(r.due_date)}` : ""}
                      </p>
                    </button>
                    <button
                      onClick={() => addToDay([r.id])}
                      title="Adicionar ao meu dia"
                      className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />Hoje
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Kpi({ Icon, value, label, tone }: { Icon: typeof Sun; value: number | string; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <Icon className={cn("h-4 w-4", tone)} />
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DayRow({ row, today, running, onStart, onFinish, onPostpone, onOpen }: {
  row: Row;
  today: string;
  running: boolean;
  onStart: () => void;
  onFinish: () => void;
  onPostpone: () => void;
  onOpen: () => void;
}) {
  const late = !!row.due_date && row.due_date < today;
  return (
    <div className="group flex items-center gap-3 border-b border-border/60 px-3 py-2.5 transition last:border-b-0 hover:bg-muted/30">
      <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: colorValue(row.color) ?? "transparent" }} />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{row.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
          <span>{row.clients?.name ?? "—"}</span>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span>{STAGE_LABEL[row.status]}</span>
          <span className={cn("ml-1", PRIORITY_COLOR[row.priority])}>{PRIORITY_LABEL[row.priority]}</span>
          {row.due_date && (
            <span className={cn("ml-1", late && "font-medium text-destructive")}>
              {late ? "atrasada · " : ""}{formatDue(row.due_date, row.due_time)}
            </span>
          )}
          {row.estimated_hours ? <span className="ml-1">· {hoursLabel(Number(row.estimated_hours))}</span> : null}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
        <button
          onClick={onPostpone}
          title="Passar para amanhã"
          className="flex h-7 items-center gap-1 rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition hover:text-foreground"
        >
          Amanhã
        </button>
        <button
          onClick={onStart}
          title="Começar a editar (inicia o cronômetro)"
          className={cn(
            "flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] transition",
            running ? "border-primary/50 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:border-primary/50 hover:text-primary",
          )}
        >
          <Play className="h-3.5 w-3.5" />{running ? "Rodando" : "Começar"}
        </button>
        <button
          onClick={onFinish}
          title="Marcar como pronto (vai para revisão)"
          className="flex h-7 items-center gap-1 rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition hover:border-[oklch(0.72_0.17_155)] hover:text-[oklch(0.72_0.17_155)]"
        >
          <Check className="h-3.5 w-3.5" />Pronto
        </button>
      </div>
    </div>
  );
}
