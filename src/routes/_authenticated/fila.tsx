import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StartTimerButton } from "@/components/timer";
import { ColorPicker } from "@/components/color-tag";
import { DeleteAction } from "@/components/delete-action";
import { STAGE_LABEL, STAGE_ACCENT, PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ListOrdered, Loader2, Sun, CheckCircle2, AlarmClock, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fila")({
  component: FilaPage,
  head: () => ({
    meta: [
      { title: "Fila de produção — alves.edt" },
      { name: "description", content: "Fila do dia e fila geral de vídeos em produção da agência." },
      { property: "og:title", content: "Fila de produção — alves.edt" },
      { property: "og:description", content: "Acompanhe o que precisa ser editado hoje e a fila geral de demandas." },
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
  created_at: string;
  client_id: string;
  color: string | null;
  clients: { name: string } | null;
};

const DONE: VideoStatus[] = ["aprovado", "entregue"];
const PRIORITY_WEIGHT: Record<VideoPriority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FilaPage() {
  const [tab, setTab] = useState<"hoje" | "geral">("hoje");
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const today = todayIso();

  const { data, isLoading } = useQuery({
    queryKey: ["fila-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, status, priority, due_date, created_at, client_id, color, clients(name)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: { status?: VideoStatus; due_date?: string | null } }) => {
      const { error } = await supabase.from("videos").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fila-videos"] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const pending = useMemo(
    () =>
      (data ?? [])
        .filter((v) => !DONE.includes(v.status))
        .filter((v) => !term || v.title.toLowerCase().includes(term) || (v.clients?.name ?? "").toLowerCase().includes(term))
        .sort((a, b) => {
          const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
          if (pw !== 0) return pw;
          const ad = a.due_date ?? "9999-12-31";
          const bd = b.due_date ?? "9999-12-31";
          return ad.localeCompare(bd);
        }),
    [data, term],
  );

  const late = pending.filter((v) => v.due_date && v.due_date < today);
  const dueToday = pending.filter((v) => v.due_date === today);
  const inProgress = pending.filter((v) => v.status === "editando" && v.due_date !== today && !(v.due_date && v.due_date < today));
  const hoje = [...late, ...dueToday, ...inProgress];
  const rest = pending.filter((v) => !hoje.some((h) => h.id === v.id));

  const list = tab === "hoje" ? hoje : pending;

  return (
    <div className="px-6 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Fila de produção"
        subtitle="O que precisa ser editado hoje e a fila geral de demandas"
        actions={
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar vídeo ou cliente…"
              className="h-9 w-52"
            />
            <div className="flex items-center rounded-md border border-border p-0.5">
              <TabBtn active={tab === "hoje"} onClick={() => setTab("hoje")} icon={<Sun className="h-3.5 w-3.5" />} label={`Hoje (${hoje.length})`} />
              <TabBtn active={tab === "geral"} onClick={() => setTab("geral")} icon={<ListOrdered className="h-3.5 w-3.5" />} label={`Fila geral (${pending.length})`} />
            </div>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Atrasados" value={late.length} icon={<AlarmClock className="h-4 w-4" />} tone="text-destructive" />
        <Kpi label="Para hoje" value={dueToday.length} icon={<CalendarClock className="h-4 w-4" />} tone="text-primary" />
        <Kpi label="Em edição" value={pending.filter((v) => v.status === "editando").length} icon={<Loader2 className="h-4 w-4" />} tone="text-[oklch(0.78_0.16_75)]" />
        <Kpi label="Na fila" value={rest.length} icon={<Inbox className="h-4 w-4" />} tone="text-muted-foreground" />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-[oklch(0.68_0.17_155)]" />
            {tab === "hoje" ? "Nada na fila de hoje. Tudo em dia." : "Nenhuma demanda pendente."}
          </div>
        ) : (
          list.map((v, i) => {
            const isLate = !!v.due_date && v.due_date < today;
            return (
              <div
                key={v.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40",
                  i > 0 && "border-t border-border/60",
                )}
              >
                <span className="w-6 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STAGE_ACCENT[v.status] }} />
                <ColorPicker table="videos" id={v.id} color={v.color} invalidate={[["fila-videos"], ["videos-workflow"]]} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.clients?.name ?? "—"} · <span className={PRIORITY_COLOR[v.priority]}>{PRIORITY_LABEL[v.priority]}</span>
                  </p>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground">
                      {STAGE_LABEL[v.status]}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-1">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => patch.mutate({ id: v.id, changes: { status: s } })}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted",
                          s === v.status && "bg-muted",
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[s] }} />
                        {STAGE_LABEL[s]}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <span className={cn("w-24 shrink-0 text-right text-[11px]", isLate ? "text-destructive" : "text-muted-foreground")}>
                  {v.due_date ? formatDate(v.due_date) : "sem prazo"}
                </span>

                {v.due_date !== today && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => patch.mutate({ id: v.id, changes: { due_date: today } })}
                    title="Puxar para hoje"
                  >
                    <Sun className="mr-1 h-3 w-3" />Hoje
                  </Button>
                )}

                <StartTimerButton videoId={v.id} label={`${v.clients?.name ?? ""} · ${v.title}`} showTotal compact />

                <DeleteAction
                  table="videos"
                  id={v.id}
                  title={`Excluir "${v.title}"?`}
                  invalidate={[["fila-videos"], ["videos-workflow"], ["dashboard"]]}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs transition",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
      <div className={cn("flex items-center gap-1.5 text-[11px] uppercase tracking-wider", tone)}>
        {icon}
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
