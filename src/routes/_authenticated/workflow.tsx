import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeleteAction } from "@/components/delete-action";
import { useMarquee } from "@/components/marquee-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Loader2, Layers3, Rows3, LayoutGrid, SplitSquareVertical, Link2, Trash2, ExternalLink, ArrowLeft, Folder, X, Users, ChevronDown, ChevronRight, Layers, GripVertical, CalendarClock, Timer as TimerIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { STAGE_LABEL, STAGE_ACCENT, PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MonthPicker, useMonthFromSearch } from "@/components/month-picker";
import { StartTimerButton, TimerBadge, BatchTimer } from "@/components/timer";
import { useVideoTime, useVideoPace, fmtEstimate, fmt as fmtTime } from "@/hooks/use-timer";
import { sfx } from "@/lib/sfx";
import { ColorPicker, colorValue } from "@/components/color-tag";
import { DueDatePopover, DueBadge } from "@/components/due-date-popover";

export const Route = createFileRoute("/_authenticated/workflow")({
  component: WorkflowPage,
  validateSearch: (search: Record<string, unknown>) => ({
    month: typeof search.month === "string" ? search.month : undefined,
  }),
  head: () => ({ meta: [{ title: "Workflow — AlvasharFlow" }] }),
});

type GroupId = "sem_material" | "em_producao" | "enviado" | "em_revisao" | "aprovado";

const GROUPS: { id: GroupId; label: string; statuses: VideoStatus[]; dot: string }[] = [
  { id: "sem_material", label: "Sem material", statuses: ["recebido", "briefing"], dot: "bg-[oklch(0.72_0.16_30)]" },
  { id: "em_producao", label: "Em produção", statuses: ["organizacao", "fila", "editando"], dot: "bg-[oklch(0.78_0.16_75)]" },
  { id: "enviado", label: "Enviado", statuses: ["aguardando_cliente"], dot: "bg-[oklch(0.72_0.19_235)]" },
  { id: "em_revisao", label: "Em revisão", statuses: ["revisao", "alteracoes"], dot: "bg-[oklch(0.72_0.15_300)]" },
  { id: "aprovado", label: "Aprovado", statuses: ["aprovado", "entregue"], dot: "bg-[oklch(0.68_0.17_155)]" },
];

const STATUS_TO_GROUP: Record<VideoStatus, GroupId> = GROUPS.reduce((acc, g) => {
  g.statuses.forEach((s) => (acc[s] = g.id));
  return acc;
}, {} as Record<VideoStatus, GroupId>);

const ALL_STATUSES: VideoStatus[] = Object.keys(STAGE_LABEL) as VideoStatus[];

type VideoRow = {
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

type ClientMin = { id: string; name: string; parent_client_id: string | null };

function WorkflowPage() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () =>
      ((await supabase.from("clients").select("id, name, parent_client_id").order("name")).data ?? []) as ClientMin[],
  });

  if (!selectedClient) {
    return <ClientPicker clients={clients ?? []} onPick={setSelectedClient} />;
  }
  return <WorkflowBoard clientId={selectedClient} clients={clients ?? []} onBack={() => setSelectedClient(null)} />;
}

function ClientPicker({ clients, onPick }: { clients: ClientMin[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const { data: counts } = useQuery({
    queryKey: ["clients-video-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("videos").select("client_id, status");
      const map = new Map<string, { total: number; pendentes: number }>();
      (data ?? []).forEach((v) => {
        const c = map.get(v.client_id) ?? { total: 0, pendentes: 0 };
        c.total++;
        if (v.status !== "entregue" && v.status !== "aprovado") c.pendentes++;
        map.set(v.client_id, c);
      });
      return map;
    },
  });

  const term = q.toLowerCase();
  const parents = clients.filter((c) => !c.parent_client_id);
  const childrenOf = (id: string) => clients.filter((c) => c.parent_client_id === id);

  const visible = parents
    .map((p) => {
      const kids = childrenOf(p.id);
      const matches = p.name.toLowerCase().includes(term);
      const matchedKids = kids.filter((k) => k.name.toLowerCase().includes(term));
      if (!term || matches) return { parent: p, kids };
      if (matchedKids.length) return { parent: p, kids: matchedKids };
      return null;
    })
    .filter(Boolean) as { parent: ClientMin; kids: ClientMin[] }[];

  const sum = (ids: string[]) =>
    ids.reduce(
      (acc, id) => {
        const i = counts?.get(id);
        return { total: acc.total + (i?.total ?? 0), pendentes: acc.pendentes + (i?.pendentes ?? 0) };
      },
      { total: 0, pendentes: 0 },
    );

  return (
    <div className="px-6 pt-6 md:px-8 md:pt-8">
      <PageHeader title="Workflow" subtitle="Escolha o cliente para abrir o quadro de demandas" />
      <div className="mt-6 max-w-md">
        <Input placeholder="Buscar cliente ou marca…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          onClick={() => onPick("all")}
          className="group flex items-center gap-3 self-start rounded-lg border border-dashed border-border bg-card/30 px-4 py-4 text-left transition hover:border-primary/50 hover:bg-card/60"
        >
          <div className="rounded-md bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Todos os clientes</p>
            <p className="text-xs text-muted-foreground">Visão consolidada</p>
          </div>
        </button>
        {visible.map(({ parent, kids }) => {
          const info = sum([parent.id, ...kids.map((k) => k.id)]);
          return (
            <div key={parent.id} className="self-start rounded-lg border border-border bg-card/40 transition hover:border-primary/40">
              <button
                onClick={() => onPick(parent.id)}
                className="group flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <div className="rounded-md bg-muted/60 p-2 text-muted-foreground group-hover:text-foreground">
                  {kids.length > 0 ? <Layers className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{parent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {info.total > 0 ? `${info.pendentes} pendentes · ${info.total} vídeos` : "Sem vídeos"}
                    {kids.length > 0 && ` · ${kids.length} marca${kids.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </button>
              {kids.length > 0 && (
                <div className="border-t border-border/60 px-2 pb-2 pt-1.5">
                  {kids.map((k) => {
                    const ki = counts?.get(k.id);
                    return (
                      <button
                        key={k.id}
                        onClick={() => onPick(k.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted/50"
                      >
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        <span className="min-w-0 flex-1 truncate text-xs">{k.name}</span>
                        <span className="text-[10px] text-muted-foreground">{ki?.total ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function WorkflowBoard({ clientId, clients, onBack }: {
  clientId: string;
  clients: ClientMin[];
  onBack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [view, setView] = useState<"split" | "kanban" | "list">("split");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const clientName = clientId === "all" ? "Todos os clientes" : clients.find((c) => c.id === clientId)?.name ?? "Cliente";
  const scopeIds = useMemo(
    () => (clientId === "all" ? [] : [clientId, ...clients.filter((c) => c.parent_client_id === clientId).map((c) => c.id)]),
    [clientId, clients],
  );

  const { data: allVideos, isLoading } = useQuery({
    queryKey: ["videos-workflow", clientId, scopeIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("videos").select("id, title, status, priority, due_date, due_time, created_at, client_id, color, clients(name)").order("position");
      if (clientId !== "all") q = q.in("client_id", scopeIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VideoRow[];
    },
  });

  // Filtro por mês: usa o prazo do vídeo quando existe, senão a data de criação.
  const { ym } = useMonthFromSearch();
  const videos = useMemo(
    () => (allVideos ?? []).filter((v) => (v.due_date ?? v.created_at).slice(0, 7) === ym),
    [allVideos, ym],
  );
  const hiddenCount = (allVideos?.length ?? 0) - videos.length;



  const qkey = useMemo(() => ["videos-workflow", clientId, scopeIds.join(",")], [clientId, scopeIds]);
  type VideoPatch = { status?: VideoStatus; due_date?: string | null; due_time?: string | null; priority?: VideoPriority };
  const patch = useMutation({
    mutationFn: async ({ ids, changes }: { ids: string[]; changes: VideoPatch }) => {
      const { error } = await supabase.from("videos").update(changes).in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, changes }) => {
      await qc.cancelQueries({ queryKey: qkey });
      const prev = qc.getQueryData<VideoRow[]>(qkey);
      qc.setQueryData<VideoRow[]>(qkey, (old) =>
        (old ?? []).map((v) => (ids.includes(v.id) ? { ...v, ...changes } as VideoRow : v)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(qkey, ctx?.prev);
      toast.error("Falha ao atualizar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const marquee = useMarquee((ids, additive) => {
    if (ids.length) sfx.select();
    setSelected((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      ids.forEach((id) => next.add(id));
      return next;
    });
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const out: Record<GroupId, VideoRow[]> = {
      sem_material: [], em_producao: [], enviado: [], em_revisao: [], aprovado: [],
    };
    (videos ?? []).forEach((v) => {
      const g = STATUS_TO_GROUP[v.status];
      if (g) out[g].push(v);
    });
    return out;
  }, [videos]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); sfx.deselect(); } else { next.add(id); sfx.select(); }
      return next;
    });
  }
  function clearSel() { if (selected.size) sfx.close(); setSelected(new Set()); }

  function onDragEnd(e: DragEndEvent) {
    const dragId = String(e.active.id);
    const toGroup = e.over?.id as GroupId | undefined;
    if (!toGroup) return;
    const target = GROUPS.find((g) => g.id === toGroup)!;

    // Stack drag: "stack::<groupId>::<clientId>" moves every video in that stack.
    if (dragId.startsWith("stack::")) {
      const [, fromGroup, cid] = dragId.split("::");
      if (fromGroup === toGroup) return;
      const vids = (videos ?? []).filter((v) => v.client_id === cid && STATUS_TO_GROUP[v.status] === fromGroup);
      if (vids.length === 0) return;
      patch.mutate({ ids: vids.map((v) => v.id), changes: { status: target.statuses[0] } });
      sfx.drop();
      return;
    }

    // If dragged item is part of selection, move whole selection; else move just it.
    const ids = selected.has(dragId) ? Array.from(selected) : [dragId];
    const vids = (videos ?? []).filter((v) => ids.includes(v.id) && STATUS_TO_GROUP[v.status] !== toGroup);
    if (vids.length === 0) return;
    patch.mutate({ ids: vids.map((v) => v.id), changes: { status: target.statuses[0] } });
    sfx.drop();
    if (selected.has(dragId)) setSelected(new Set());
  }


  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col md:min-h-screen">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Trocar cliente
        </button>
        <PageHeader
          title={clientName}
          subtitle={hiddenCount > 0 ? `${videos.length} vídeo(s) no mês · ${hiddenCount} fora do período` : "Kanban e lista sincronizados"}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker />
              <div className="hidden items-center rounded-md border border-border p-0.5 md:flex">
                <ViewBtn active={view === "split"} onClick={() => setView("split")} icon={<SplitSquareVertical className="h-3.5 w-3.5" />} label="Ambos" />
                <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Kanban" />
                <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={<Rows3 className="h-3.5 w-3.5" />} label="Lista" />
              </div>
              <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Layers3 className="mr-1 h-4 w-4" />Nova leva</Button>
                </DialogTrigger>
                <BatchVideosDialog onClose={() => setBatchOpen(false)} clients={clients} defaultClientId={clientId === "all" ? "" : clientId} />
              </Dialog>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Novo vídeo</Button></DialogTrigger>
                <NewVideoDialog onClose={() => setOpen(false)} clients={clients} defaultClientId={clientId === "all" ? "" : clientId} />
              </Dialog>
            </div>
          }
        />
        <PacePanel videos={videos} />
      </div>


      {isLoading ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-6 px-6 pb-24 md:px-8">
          {view !== "list" && (
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <div
                ref={marquee.containerRef}
                onPointerDown={marquee.onPointerDown}
                className="relative overflow-x-auto select-none"
              >
                {marquee.overlay}
                <div className="flex min-w-max gap-3">

                  {GROUPS.map((g) => {
                    const vids = grouped[g.id];
                    // group cards by client inside column for visual organization
                    const byClient = new Map<string, VideoRow[]>();
                    vids.forEach((v) => {
                      const arr = byClient.get(v.client_id) ?? [];
                      arr.push(v);
                      byClient.set(v.client_id, arr);
                    });
                    return (
                      <Column key={g.id} id={g.id} label={g.label} dot={g.dot} count={vids.length}>
                        {Array.from(byClient.entries()).map(([cid, arr]) => {
                          const key = `${g.id}::${cid}`;
                          const isExpanded = expandedGroups.has(key);
                          return (
                            <ClientStack
                              key={cid}
                              stackId={`stack::${g.id}::${cid}`}
                              name={arr[0].clients?.name ?? "—"}
                              parentName={
                                clients.find((c) => c.id === clients.find((x) => x.id === cid)?.parent_client_id)?.name ?? null
                              }
                              count={arr.length}
                              expanded={isExpanded}
                              onToggle={() => toggleGroup(key)}
                              ids={arr.map((v) => v.id)}
                              onSetStatus={(s) => patch.mutate({ ids: arr.map((v) => v.id), changes: { status: s } })}
                            >
                              {arr.map((v) => (
                                <VideoCard key={v.id} video={v}
                                  selected={selected.has(v.id)}
                                  onToggle={() => toggle(v.id)}
                                  onExpand={() => setDetailId(v.id)}
                                  anySelected={selected.size > 0}
                                  selectedCount={selected.size}
                                />
                              ))}
                            </ClientStack>
                          );
                        })}
                      </Column>
                    );
                  })}
                </div>
              </div>
            </DndContext>
          )}

          {view !== "kanban" && (
            <ListView
              videos={videos ?? []}
              selected={selected}
              onToggle={toggle}
              onToggleAll={(ids, on) => setSelected((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => { if (on) next.add(id); else next.delete(id); });
                return next;
              })}
              onStatusChange={(id, status) => patch.mutate({ ids: [id], changes: { status } })}
              onDueChange={(id, due_date) => patch.mutate({ ids: [id], changes: { due_date } })}
              onOpen={(id) => setDetailId(id)}
            />
          )}
        </div>
      )}

      <VideoDetailSheet videoId={detailId} onClose={() => setDetailId(null)} />
      <TimerBadge />

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onClear={clearSel}
          onSetStatus={(s) => { patch.mutate({ ids: Array.from(selected), changes: { status: s } }); clearSel(); }}
          onSetPriority={(p) => { patch.mutate({ ids: Array.from(selected), changes: { priority: p } }); clearSel(); }}
          ids={Array.from(selected)}
          onDueDone={clearSel}
          onDeleted={() => { clearSel(); qc.invalidateQueries({ queryKey: ["videos-workflow"] }); }}
        />
      )}
    </div>
  );
}

/**
 * Painel de ritmo: usa as sessões de cronômetro para estimar quanto tempo
 * ainda falta para terminar as demandas abertas desta visão.
 */
function PacePanel({ videos }: { videos: VideoRow[] }) {
  const { data: pace } = useVideoPace();
  const avg = pace?.avgPerVideo ?? 0;
  const pending = videos.filter((v) => v.status !== "entregue" && v.status !== "aprovado");
  if (videos.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-card/40 px-4 py-2.5 text-xs">
      <span className="flex items-center gap-1.5 font-medium">
        <TimerIcon className="h-3.5 w-3.5 text-primary" />
        Ritmo de produção
      </span>
      {avg > 0 ? (
        <>
          <span className="text-muted-foreground">
            Média por vídeo: <b className="font-mono text-foreground">{fmtEstimate(avg)}</b>
          </span>
          <span className="text-muted-foreground">
            {pending.length} em aberto ≈ <b className="font-mono text-foreground">{fmtEstimate(avg * pending.length)}</b> restantes
          </span>
          <span className="text-muted-foreground">
            Já cronometrado: <b className="font-mono text-foreground">{fmtTime(pace?.trackedSeconds ?? 0)}</b> em {pace?.trackedVideos} vídeo(s)
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">
          Use o cronômetro nos vídeos para o sistema aprender quanto tempo leva cada demanda.
        </span>
      )}
    </div>
  );
}

function BulkBar({ count, onClear, onSetStatus, onSetPriority, ids, onDeleted, onDueDone }: {
  count: number;
  onClear: () => void;
  onSetStatus: (s: VideoStatus) => void;
  onSetPriority: (p: VideoPriority) => void;
  ids: string[];
  onDeleted: () => void;
  onDueDone: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-lg">
        <span className="pl-1 text-xs font-medium">{count} selecionado{count > 1 ? "s" : ""}</span>
        <div className="mx-1 h-4 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">Alterar situação</Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="center">
            {ALL_STATUSES.map((s) => (
              <button key={s} onClick={() => onSetStatus(s)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[s] }} />
                {STAGE_LABEL[s]}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <DueDatePopover
          table="videos"
          ids={ids}
          invalidate={[["videos-workflow"], ["fila-videos"], ["dashboard"]]}
          align="center"
          onDone={onDueDone}
        >
          <Button size="sm" variant="outline" className="h-7 text-xs">Prazo</Button>
        </DueDatePopover>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">Prioridade</Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="center">
            {(["baixa","media","alta","urgente"] as VideoPriority[]).map((p) => (
              <button key={p} onClick={() => onSetPriority(p)}
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs hover:bg-muted">
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <DeleteAction
          table="videos"
          id={ids}
          variant="button"
          label={`Excluir ${count}`}
          title={`Excluir ${count} vídeo${count > 1 ? "s" : ""}?`}
          description="Os vídeos selecionados serão removidos permanentemente."
          successMessage="Vídeos excluídos"
          invalidate={[["videos-workflow"], ["videos-all"], ["dashboard"], ["clients"]]}
          onDeleted={onDeleted}
          className="h-7"
        />
        <button onClick={onClear} className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Limpar">

          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs transition",
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
    )}>{icon}{label}</button>
  );
}

function Column({ id, label, dot, count, children }: { id: GroupId; label: string; dot: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(
      "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card/40 transition",
      isOver && "border-primary/60 bg-primary/5",
    )}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <p className="text-xs font-semibold">{label}</p>
        <span className="ml-auto text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="min-h-24 space-y-2 p-2">{children}</div>
    </div>
  );
}

function ClientStack({ stackId, name, parentName, count, expanded, onToggle, children, ids, onSetStatus }: {
  stackId: string;
  name: string;
  parentName?: string | null;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  ids: string[];
  onSetStatus: (s: VideoStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: stackId });
  const { data: pace } = useVideoPace();
  const estimate = (pace?.avgPerVideo ?? 0) > 0 ? fmtEstimate((pace!.avgPerVideo) * count) : null;
  const parentBadge = parentName ? (
    <span
      title={`Marca de ${parentName}`}
      className="inline-flex h-4 shrink-0 items-center rounded-sm bg-primary/10 px-1 text-[9px] font-semibold uppercase text-primary"
    >
      {parentName.slice(0, 1)}
    </span>
  ) : null;
  if (expanded) {
    return (
      <div className="space-y-1 rounded-md border border-border/60 bg-background/40 p-1.5">
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-left transition hover:bg-muted/40"
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
          {parentBadge}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{name}</span>
          <span className="ml-auto text-[10px] text-muted-foreground/60">{count}</span>
        </button>
        <BatchTimer label={`${name} · ${count} vídeo(s)`} videoIds={ids} remaining={count} />
        <div className="space-y-1.5">{children}</div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 shadow-sm transition hover:border-primary/40",
        isDragging && "opacity-40",
      )}
    >
      <button
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        aria-label="Expandir"
      >
        <div className="rounded-md bg-muted/60 p-1 text-muted-foreground group-hover:text-foreground">
          <Layers className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-xs font-medium">{parentBadge}{name}</p>
          <p className="text-[10px] text-muted-foreground">
            {count} vídeo{count > 1 ? "s" : ""}{parentName ? ` · ${parentName}` : ""}
            {estimate && <span className="ml-1 text-primary/80">≈ {estimate}</span>}
          </p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
      </button>
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab rounded p-1 text-muted-foreground/40 hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastar"
        title="Arrastar para mover todos"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            title="Alterar situação e prazo de todos"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <span className="sr-only">Ações</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {count} vídeo{count > 1 ? "s" : ""} de {name}{estimate ? ` · ≈ ${estimate}` : ""}
          </p>
          <DueDatePopover
            table="videos"
            ids={ids}
            align="end"
            invalidate={[["videos-workflow"], ["fila-videos"], ["dashboard"]]}
          >
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted">
              <CalendarClock className="h-3.5 w-3.5" />Definir prazo
            </button>
          </DueDatePopover>
          <div className="my-1 h-px bg-border" />
          {ALL_STATUSES.map((s) => (
            <button key={s} onClick={() => onSetStatus(s)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[s] }} />
              {STAGE_LABEL[s]}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function VideoCard({ video, selected, onToggle, onExpand, anySelected, selectedCount }: {
  video: VideoRow;
  selected: boolean;
  onToggle: () => void;
  onExpand: () => void;
  anySelected: boolean;
  selectedCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: video.id });
  return (
    <div ref={setNodeRef} data-vid={video.id}
      className={cn(
        "group rounded-md border border-border bg-card px-2.5 py-2 text-sm shadow-sm transition hover:border-primary/40",
        selected && "border-primary/60 ring-1 ring-primary/40",
        isDragging && "opacity-40",
      )}
      style={{
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
        ...(colorValue(video.color) ? { borderLeft: `3px solid ${colorValue(video.color)}` } : {}),
      }}
    >
      <div className="flex items-start gap-2">
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox checked={selected} onCheckedChange={onToggle} className="h-3.5 w-3.5" />
        </div>
        <div {...listeners} {...attributes} className="min-w-0 flex-1 cursor-grab active:cursor-grabbing">
          <p className="truncate text-xs font-medium">{video.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <DueDatePopover
              table="videos"
              ids={[video.id]}
              due={video.due_date}
              time={video.due_time}
              invalidate={[["videos-workflow"], ["fila-videos"], ["dashboard"]]}
            >
              <button onClick={(e) => e.stopPropagation()} aria-label="Prazo">
                <DueBadge due={video.due_date} time={video.due_time} />
              </button>
            </DueDatePopover>
            <span className={cn("font-medium", PRIORITY_COLOR[video.priority])}>{PRIORITY_LABEL[video.priority]}</span>
            {selected && anySelected && selectedCount > 1 && (
              <span className="text-primary">· move {selectedCount}</span>
            )}
          </div>
        </div>
        <ColorPicker table="videos" id={video.id} color={video.color} invalidate={[["videos-workflow"], ["fila-videos"]]} className="mt-0.5" />
        <button onClick={onExpand} className="opacity-0 transition group-hover:opacity-100" aria-label="Abrir">
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}

function ListView({ videos, selected, onToggle, onToggleAll, onStatusChange, onDueChange, onOpen }: {
  videos: VideoRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onStatusChange: (id: string, status: VideoStatus) => void;
  onDueChange: (id: string, due: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const allIds = videos.map((v) => v.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/30">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-2.5">
              <Checkbox checked={allSelected} onCheckedChange={(v) => onToggleAll(allIds, !!v)} />
            </th>
            <th className="w-32 px-4 py-2.5 text-left font-medium">Prazo</th>
            <th className="px-4 py-2.5 text-left font-medium">Título</th>
            <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
            <th className="px-4 py-2.5 text-left font-medium">Situação</th>
            <th className="px-4 py-2.5 text-left font-medium">Prioridade</th>
            <th className="w-10 px-2" />
          </tr>
        </thead>
        <tbody>
          {videos.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">Nenhum vídeo</td></tr>
          ) : videos.map((v) => (
            <tr key={v.id} className={cn("border-b border-border/60 last:border-0 hover:bg-muted/20", selected.has(v.id) && "bg-primary/5")}>
              <td className="px-3 py-1.5">
                <Checkbox checked={selected.has(v.id)} onCheckedChange={() => onToggle(v.id)} />
              </td>
              <td className="px-4 py-1.5">
                <DueDatePopover
                  table="videos"
                  ids={[v.id]}
                  due={v.due_date}
                  time={v.due_time}
                  invalidate={[["videos-workflow"], ["fila-videos"], ["dashboard"]]}
                >
                  <button aria-label="Prazo"><DueBadge due={v.due_date} time={v.due_time} /></button>
                </DueDatePopover>
              </td>
              <td className="px-4 py-2 font-medium">
                <span className="flex items-center gap-2">
                  <ColorPicker table="videos" id={v.id} color={v.color} invalidate={[["videos-workflow"], ["fila-videos"]]} />
                  {v.title}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{v.clients?.name ?? "—"}</td>
              <td className="px-4 py-2">
                <StatusBadge status={v.status} onChange={(s) => onStatusChange(v.id, s)} />
              </td>
              <td className={cn("px-4 py-2 text-xs font-medium", PRIORITY_COLOR[v.priority])}>{PRIORITY_LABEL[v.priority]}</td>
              <td className="px-2">
                <div className="flex items-center justify-end gap-1">
                  <StartTimerButton videoId={v.id} label={v.title} compact variant="ghost" className="h-7 px-2" />
                  <button onClick={() => onOpen(v.id)} className="text-muted-foreground hover:text-foreground" aria-label="Abrir">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, onChange }: { status: VideoStatus; onChange: (s: VideoStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium transition hover:border-primary/50">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[status] }} />
          {STAGE_LABEL[status]}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => { onChange(s); setOpen(false); }}
            className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted", s === status && "bg-muted")}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[s] }} />
            {STAGE_LABEL[s]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function VideoDetailSheet({ videoId, onClose }: { videoId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: video } = useQuery({
    queryKey: ["video-detail", videoId],
    enabled: !!videoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos")
        .select("*, clients(name)")
        .eq("id", videoId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["video-files", videoId],
    enabled: !!videoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("video_files").select("*").eq("video_id", videoId!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    title: "", description: "", due_date: "",
    priority: "media" as VideoPriority, status: "recebido" as VideoStatus,
    raw_files_link: "", final_file_link: "",
  });

  useEffect(() => {
    if (!video) return;
    setForm({
      title: video.title ?? "", description: video.description ?? "",
      due_date: video.due_date ?? "", priority: video.priority, status: video.status,
      raw_files_link: video.raw_files_link ?? "", final_file_link: video.final_file_link ?? "",
    });
  }, [video]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("videos").update({
        title: form.title, description: form.description || null,
        due_date: form.due_date || null, priority: form.priority, status: form.status,
        raw_files_link: form.raw_files_link || null, final_file_link: form.final_file_link || null,
      }).eq("id", videoId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["video-detail", videoId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addFile = useMutation({
    mutationFn: async ({ name, url }: { name: string; url: string }) => {
      if (!video?.workspace_id) throw new Error("Workspace não encontrado");
      const { error } = await supabase.from("video_files").insert({ workspace_id: video.workspace_id, video_id: videoId!, name, url });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-files", videoId] });
      toast.success("Arquivo linkado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("video_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-files", videoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [newLink, setNewLink] = useState({ name: "", url: "" });

  return (
    <Sheet open={!!videoId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{video?.title ?? "Vídeo"}</SheetTitle>
          {video?.clients?.name && <p className="text-xs text-muted-foreground">{video.clients.name}</p>}
          {videoId && (
            <div className="pt-2">
              <DeleteAction
                table="videos"
                id={videoId}
                variant="button"
                label="Excluir vídeo"
                title={`Excluir "${video?.title ?? "vídeo"}"?`}
                description="O vídeo, seus links e arquivos serão removidos permanentemente."
                successMessage="Vídeo excluído"
                invalidate={[["videos-workflow"], ["videos-all"], ["dashboard"], ["clients"]]}
                onDeleted={onClose}
              />
            </div>
          )}
        </SheetHeader>


        {videoId && (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-card/40 px-3 py-2">
            <StartTimerButton videoId={videoId} label={video?.title ?? "Vídeo"} />
            <TotalTime videoId={videoId} />
          </div>
        )}

        {!video ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VideoStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[s] }} />
                          {STAGE_LABEL[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as VideoPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Link do material bruto</Label>
                <Input placeholder="https://drive.google.com/…" value={form.raw_files_link}
                  onChange={(e) => setForm({ ...form, raw_files_link: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Link da entrega final</Label>
                <Input placeholder="https://…" value={form.final_file_link}
                  onChange={(e) => setForm({ ...form, final_file_link: e.target.value })} />
              </div>
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Arquivos anexos</p>
              <div className="space-y-1.5">
                {(files ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum arquivo linkado.</p>
                )}
                {(files ?? []).map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-primary">{f.name}</a>
                    <button onClick={() => removeFile.mutate(f.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Nome" value={newLink.name} onChange={(e) => setNewLink({ ...newLink, name: e.target.value })} />
                <Input placeholder="URL" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} />
                <Button variant="outline" size="sm" disabled={!newLink.name || !newLink.url || addFile.isPending}
                  onClick={() => { addFile.mutate(newLink); setNewLink({ name: "", url: "" }); }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NewVideoDialog({ onClose, clients, defaultClientId }: { onClose: () => void; clients: { id: string; name: string }[]; defaultClientId?: string }) {
  const [form, setForm] = useState({ title: "", description: "", client_id: defaultClientId ?? "", priority: "media" as VideoPriority, due_date: "" });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    if (!me?.workspaceId) { toast.error("Workspace não encontrado"); return; }
    setSaving(true);
    const { data: pkg } = await supabase.from("client_packages").select("id").eq("client_id", form.client_id).eq("status", "ativo").maybeSingle();
    const { error } = await supabase.from("videos").insert({
      workspace_id: me.workspaceId,
      title: form.title, description: form.description || null, client_id: form.client_id,
      priority: form.priority, due_date: form.due_date || null, package_id: pkg?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Vídeo criado");
    qc.invalidateQueries({ queryKey: ["videos-workflow"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    onClose();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo vídeo</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5"><Label>Título *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></div>
        <div className="space-y-1.5"><Label>Cliente *</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as VideoPriority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function TotalTime({ videoId }: { videoId: string }) {
  const { data } = useVideoTime(videoId);
  return (
    <p className="text-xs text-muted-foreground">
      Tempo registrado: <span className="font-mono tabular-nums text-foreground">{fmtTime(data ?? 0)}</span>
    </p>
  );
}

function BatchVideosDialog({ onClose, clients, defaultClientId }: {
  onClose: () => void;
  clients: ClientMin[];
  defaultClientId?: string;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [mode, setMode] = useState<"lista" | "quantidade">("lista");
  const [titles, setTitles] = useState("");
  const [prefix, setPrefix] = useState("");
  const [qty, setQty] = useState(5);
  const [status, setStatus] = useState<VideoStatus>("recebido");
  const [priority, setPriority] = useState<VideoPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const parsed = useMemo(() => {
    if (mode === "lista") {
      return titles.split("\n").map((t) => t.trim()).filter(Boolean);
    }
    const base = prefix.trim() || "Vídeo";
    const n = Math.max(1, Math.min(100, Number(qty) || 1));
    return Array.from({ length: n }, (_, i) => `${base} ${String(i + 1).padStart(2, "0")}`);
  }, [mode, titles, prefix, qty]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { toast.error("Selecione um cliente"); return; }
    if (!me?.workspaceId) { toast.error("Workspace não encontrado"); return; }
    if (parsed.length === 0) { toast.error("Adicione ao menos um título"); return; }
    setSaving(true);
    const { data: pkg } = await supabase.from("client_packages")
      .select("id").eq("client_id", clientId).eq("status", "ativo").maybeSingle();
    const rows = parsed.map((title) => ({
      workspace_id: me.workspaceId!,
      client_id: clientId,
      title,
      status,
      priority,
      due_date: dueDate || null,
      package_id: pkg?.id ?? null,
    }));
    const { error } = await supabase.from("videos").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} vídeos criados`);
    qc.invalidateQueries({ queryKey: ["videos-workflow"] });
    qc.invalidateQueries({ queryKey: ["clients-video-counts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    onClose();
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Nova leva de vídeos</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.parent_client_id ? `↳ ${c.name}` : c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center rounded-md border border-border p-0.5">
          <ViewBtn active={mode === "lista"} onClick={() => setMode("lista")} icon={<Rows3 className="h-3.5 w-3.5" />} label="Lista de títulos" />
          <ViewBtn active={mode === "quantidade"} onClick={() => setMode("quantidade")} icon={<Layers3 className="h-3.5 w-3.5" />} label="Quantidade" />
        </div>

        {mode === "lista" ? (
          <div className="space-y-1.5">
            <Label>Títulos (um por linha)</Label>
            <Textarea
              rows={6}
              value={titles}
              onChange={(e) => setTitles(e.target.value)}
              placeholder={"Reels 01\nReels 02\nCorte podcast"}
            />
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <Label>Prefixo</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Ex: Reels agosto" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as VideoStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as VideoPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["baixa","media","alta","urgente"] as VideoPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prazo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {parsed.length > 0 ? `${parsed.length} vídeo(s) serão criados: ${parsed.slice(0, 3).join(", ")}${parsed.length > 3 ? "…" : ""}` : "Nenhum vídeo definido ainda."}
        </p>

        <DialogFooter>
          <Button type="submit" disabled={saving || parsed.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar {parsed.length || ""} vídeos
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export const _fmt = formatDate;
