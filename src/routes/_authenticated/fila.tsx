import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "@/components/color-tag";
import { DeleteAction } from "@/components/delete-action";
import { STAGE_LABEL, STAGE_ACCENT, PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { DueDatePopover, DueBadge } from "@/components/due-date-popover";
import { Segmented } from "@/components/segmented";
import { naturalCompare, formatBRL } from "@/lib/format";
import { WeekBoard } from "@/components/week-board";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { BatchVideosDialog } from "@/components/batch-videos-dialog";
import { suggestPerVideo } from "@/lib/pricing";

import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock, ListOrdered, Loader2, Sun, CheckCircle2, AlarmClock, Inbox,
  Layers, ChevronDown, ChevronRight, LayoutGrid, Layers3, Wallet,
} from "lucide-react";


export const Route = createFileRoute("/_authenticated/fila")({
  component: FilaPage,
  head: () => ({
    meta: [
      { title: "Fila de produção — AlvasharFlow" },
      { name: "description", content: "Fila do dia e fila geral dos seus vídeos em produção." },
      { property: "og:title", content: "Fila de produção — AlvasharFlow" },
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
  due_time: string | null;
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
  const [tab, setTab] = useState<"hoje" | "geral" | "semana">("hoje");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const today = todayIso();

  const { data, isLoading } = useQuery({
    queryKey: ["fila-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, status, priority, due_date, due_time, created_at, client_id, color, clients(name)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["fila-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").eq("status", "ativo");
      if (error) throw error;
      return (data ?? []).sort((a, b) => naturalCompare(a.name, b.name));
    },
  });

  const createVideo = useMutation({
    mutationFn: async (payload: { title: string; client_id: string; due_date: string | null }) => {
      const { data: pkg } = await supabase
        .from("client_packages").select("id, workspace_id")
        .eq("client_id", payload.client_id).eq("status", "ativo").maybeSingle();
      const { data: cli } = await supabase.from("clients").select("workspace_id").eq("id", payload.client_id).single();
      const { error } = await supabase.from("videos").insert({
        workspace_id: cli!.workspace_id,
        title: payload.title,
        client_id: payload.client_id,
        due_date: payload.due_date,
        package_id: pkg?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      sfx.success();
      toast.success("Vídeo criado");
      qc.invalidateQueries({ queryKey: ["fila-videos"] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => { sfx.error(); toast.error(e.message); },
  });

  const patch = useMutation({
    mutationFn: async ({ ids, changes }: { ids: string[]; changes: { status?: VideoStatus; due_date?: string | null; client_id?: string; title?: string } }) => {
      const { error } = await supabase.from("videos").update(changes).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      sfx.success();
      qc.invalidateQueries({ queryKey: ["fila-videos"] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => { sfx.error(); toast.error(e.message); },
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
          if (ad !== bd) return ad.localeCompare(bd);
          return naturalCompare(a.title, b.title);
        }),
    [data, term],
  );

  const late = pending.filter((v) => v.due_date && v.due_date < today);
  const dueToday = pending.filter((v) => v.due_date === today);
  const inProgress = pending.filter((v) => v.status === "editando" && v.due_date !== today && !(v.due_date && v.due_date < today));
  const hoje = [...late, ...dueToday, ...inProgress];
  const rest = pending.filter((v) => !hoje.some((h) => h.id === v.id));

  const list = tab === "geral" ? pending : hoje;

  const weekItems = useMemo(
    () =>
      (data ?? []).filter(
        (v) => !term || v.title.toLowerCase().includes(term) || (v.clients?.name ?? "").toLowerCase().includes(term),
      ),
    [data, term],
  );

  const clientGroups = useMemo(() => {
    const map = new Map<string, { name: string; items: Row[] }>();
    list.forEach((v) => {
      const g = map.get(v.client_id) ?? { name: v.clients?.name ?? "—", items: [] };
      g.items.push(v);
      map.set(v.client_id, g);
    });
    // Numeração sempre organizada dentro de cada cliente.
    map.forEach((g) => g.items.sort((a, b) => naturalCompare(a.title, b.title)));
    return Array.from(map.entries()).sort((a, b) => naturalCompare(a[1].name, b[1].name));
  }, [list]);



  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); sfx.open(); } else { next.add(id); sfx.close(); }
      return next;
    });
  }

  return (
    <div className="px-6 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Fila de produção"
        subtitle="O que precisa ser editado hoje e a fila geral de demandas"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar vídeo ou cliente…"
              className="h-9 w-52 rounded-full"
            />
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "hoje", label: "Hoje", icon: <Sun className="h-3.5 w-3.5" />, count: hoje.length },
                { value: "geral", label: "Fila geral", icon: <ListOrdered className="h-3.5 w-3.5" />, count: pending.length },
                { value: "semana", label: "Semana", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
              ]}
            />
            <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
              <Layers className="h-3.5 w-3.5" />Em conjunto por cliente
            </span>


          </div>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Atrasados" value={late.length} icon={<AlarmClock className="h-4 w-4" />} tone="text-destructive" />
        <Kpi label="Para hoje" value={dueToday.length} icon={<CalendarClock className="h-4 w-4" />} tone="text-primary" />
        <Kpi label="Em edição" value={pending.filter((v) => v.status === "editando").length} icon={<Loader2 className="h-4 w-4" />} tone="text-[oklch(0.78_0.16_75)]" />
        <Kpi label="Na fila" value={rest.length} icon={<Inbox className="h-4 w-4" />} tone="text-muted-foreground" />
      </div>



      {tab === "semana" ? (
        <div className="mt-6">
          <WeekBoard
            items={weekItems}
            clients={clients ?? []}
            onPatch={(ids, changes) => patch.mutate({ ids, changes })}
            onCreate={(payload) => createVideo.mutate(payload)}
          />

        </div>
      ) : (
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
          clientGroups.map(([cid, group], gi) => {
            const ids = group.items.map((v) => v.id);
            const isOpen = !collapsed.has(cid);
            return (
              <div key={cid} className={cn(gi > 0 && "border-t border-border")}>
                <div className="flex flex-wrap items-center gap-2 bg-muted/30 px-4 py-2">
                  <button onClick={() => toggleCollapsed(cid)} className="flex min-w-0 items-center gap-2">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="truncate text-sm font-medium">{group.name}</span>
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{group.items.length}</span>
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]">Situação do grupo</Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-52 p-1">
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => patch.mutate({ ids, changes: { status: s } })}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[s] }} />
                            {STAGE_LABEL[s]}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <DueDatePopover
                      table="videos"
                      ids={ids}
                      align="end"
                      invalidate={[["fila-videos"], ["videos-workflow"], ["dashboard"]]}
                    >
                      <Button size="sm" variant="outline" className="h-7 text-[11px]">Prazo do grupo</Button>
                    </DueDatePopover>
                  </div>
                </div>
                {isOpen && group.items.map((v, i) => (
                  <QueueRow key={v.id} v={v} index={i + 1} today={today} onPatch={(changes) => patch.mutate({ ids: [v.id], changes })} />
                ))}
              </div>
            );
          })
        )}

      </div>
      )}
    </div>
  );
}

function QueueRow({ v, index, today, border = true, onPatch }: {
  v: Row;
  index: number;
  today: string;
  border?: boolean;
  onPatch: (changes: { status?: VideoStatus; due_date?: string | null }) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40",
        border && "border-t border-border/60",
      )}
    >
      <span className="w-6 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{index}</span>
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
              onClick={() => onPatch({ status: s })}
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

      <DueDatePopover
        table="videos"
        ids={[v.id]}
        due={v.due_date}
        time={v.due_time}
        align="end"
        invalidate={[["fila-videos"], ["videos-workflow"], ["dashboard"]]}
      >
        <button className="shrink-0" aria-label="Prazo">
          <DueBadge due={v.due_date} time={v.due_time} />
        </button>
      </DueDatePopover>

      {v.due_date !== today && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={() => onPatch({ due_date: today })}
          title="Puxar para hoje"
        >
          <Sun className="mr-1 h-3 w-3" />Hoje
        </Button>
      )}

      <DeleteAction
        table="videos"
        id={v.id}
        title={`Excluir "${v.title}"?`}
        invalidate={[["fila-videos"], ["videos-workflow"], ["dashboard"]]}
      />
    </div>
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
