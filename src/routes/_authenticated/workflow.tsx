import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Loader2, Rows3, LayoutGrid, SplitSquareVertical } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { STAGE_LABEL, STAGE_ACCENT, PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workflow")({
  component: WorkflowPage,
  head: () => ({ meta: [{ title: "Workflow — Cortex" }] }),
});

type GroupId = "sem_material" | "em_producao" | "enviado" | "em_revisao" | "aprovado";

const GROUPS: { id: GroupId; label: string; statuses: VideoStatus[]; accent: string; dot: string }[] = [
  { id: "sem_material", label: "Sem material", statuses: ["recebido", "briefing"], accent: "oklch(0.72 0.16 30)", dot: "bg-[oklch(0.72_0.16_30)]" },
  { id: "em_producao", label: "Em produção", statuses: ["organizacao", "fila", "editando"], accent: "oklch(0.78 0.16 75)", dot: "bg-[oklch(0.78_0.16_75)]" },
  { id: "enviado", label: "Enviado", statuses: ["aguardando_cliente"], accent: "oklch(0.72 0.19 235)", dot: "bg-[oklch(0.72_0.19_235)]" },
  { id: "em_revisao", label: "Em revisão", statuses: ["revisao", "alteracoes"], accent: "oklch(0.72 0.15 300)", dot: "bg-[oklch(0.72_0.15_300)]" },
  { id: "aprovado", label: "Aprovado", statuses: ["aprovado", "entregue"], accent: "oklch(0.68 0.17 155)", dot: "bg-[oklch(0.68_0.17_155)]" },
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
  client_id: string;
  clients: { name: string } | null;
};

function WorkflowPage() {
  const [open, setOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [view, setView] = useState<"split" | "kanban" | "list">("split");
  const qc = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos-workflow", clientFilter],
    queryFn: async () => {
      let q = supabase.from("videos").select("id, title, status, priority, due_date, client_id, clients(name)").order("position");
      if (clientFilter !== "all") q = q.eq("client_id", clientFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VideoRow[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: VideoStatus }) => {
      const { error } = await supabase.from("videos").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, status }) => {
      await qc.cancelQueries({ queryKey: ["videos-workflow", clientFilter] });
      const prev = qc.getQueryData<VideoRow[]>(["videos-workflow", clientFilter]);
      qc.setQueryData<VideoRow[]>(["videos-workflow", clientFilter], (old) =>
        (old ?? []).map((v) => (ids.includes(v.id) ? { ...v, status } : v)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["videos-workflow", clientFilter], ctx?.prev);
      toast.error("Falha ao mover");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Group data: per column -> per client -> videos
  const grouped = useMemo(() => {
    const out: Record<GroupId, Map<string, VideoRow[]>> = {
      sem_material: new Map(), em_producao: new Map(), enviado: new Map(),
      em_revisao: new Map(), aprovado: new Map(),
    };
    (videos ?? []).forEach((v) => {
      const g = STATUS_TO_GROUP[v.status];
      if (!g) return;
      const bucket = out[g];
      const key = v.client_id;
      const arr = bucket.get(key) ?? [];
      arr.push(v);
      bucket.set(key, arr);
    });
    return out;
  }, [videos]);

  function onDragEnd(e: DragEndEvent) {
    const dragId = String(e.active.id); // format: "group:clientId"
    const toGroup = e.over?.id as GroupId | undefined;
    if (!toGroup) return;
    const [fromGroup, clientId] = dragId.split(":");
    if (fromGroup === toGroup) return;
    const bucket = grouped[fromGroup as GroupId].get(clientId) ?? [];
    if (bucket.length === 0) return;
    const target = GROUPS.find((g) => g.id === toGroup)!;
    move.mutate({ ids: bucket.map((v) => v.id), status: target.statuses[0] });
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col md:min-h-screen">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageHeader
          title="Workflow"
          subtitle="Kanban e lista sincronizados"
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden items-center rounded-md border border-border p-0.5 md:flex">
                <ViewBtn active={view === "split"} onClick={() => setView("split")} icon={<SplitSquareVertical className="h-3.5 w-3.5" />} label="Ambos" />
                <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Kanban" />
                <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={<Rows3 className="h-3.5 w-3.5" />} label="Lista" />
              </div>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Novo vídeo</Button></DialogTrigger>
                <NewVideoDialog onClose={() => setOpen(false)} clients={clients ?? []} />
              </Dialog>
            </div>
          }
        />
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-6 px-6 pb-8 md:px-8">
          {view !== "list" && (
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-3">
                  {GROUPS.map((g) => {
                    const bucket = grouped[g.id];
                    const totalVideos = Array.from(bucket.values()).reduce((n, arr) => n + arr.length, 0);
                    return (
                      <Column key={g.id} id={g.id} label={g.label} dot={g.dot} count={totalVideos}>
                        {Array.from(bucket.entries()).map(([clientId, vids]) => (
                          <ClientCard key={clientId} groupId={g.id} clientId={clientId}
                            name={vids[0].clients?.name ?? "—"} count={vids.length} />
                        ))}
                      </Column>
                    );
                  })}
                </div>
              </div>
            </DndContext>
          )}

          {view !== "kanban" && (
            <ListView videos={videos ?? []} onStatusChange={(id, status) => move.mutate({ ids: [id], status })} />
          )}
        </div>
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs transition",
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
    )}>{icon}{label}</button>
  );
}

function Column({ id, label, dot, count, children }: { id: GroupId; label: string; dot: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(
      "flex w-64 shrink-0 flex-col rounded-lg border border-border bg-card/40 transition",
      isOver && "border-primary/60 bg-primary/5",
    )}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <p className="text-xs font-semibold">{label}</p>
        <span className="ml-auto text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="min-h-24 space-y-1.5 p-2">{children}</div>
    </div>
  );
}

function ClientCard({ groupId, clientId, name, count }: { groupId: GroupId; clientId: string; name: string; count: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${groupId}:${clientId}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "cursor-grab rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:border-primary/40 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <p className="font-medium">{name} <span className="text-muted-foreground">— {count} {count === 1 ? "vídeo" : "vídeos"}</span></p>
    </div>
  );
}

function ListView({ videos, onStatusChange }: { videos: VideoRow[]; onStatusChange: (id: string, status: VideoStatus) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/30">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left font-medium">Prazo</th>
            <th className="px-4 py-2.5 text-left font-medium">Título</th>
            <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
            <th className="px-4 py-2.5 text-left font-medium">Situação</th>
            <th className="px-4 py-2.5 text-left font-medium">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {videos.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">Nenhum vídeo</td></tr>
          ) : videos.map((v) => (
            <tr key={v.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2 text-xs text-muted-foreground">{v.due_date ? formatDate(v.due_date) : "—"}</td>
              <td className="px-4 py-2 font-medium">{v.title}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{v.clients?.name ?? "—"}</td>
              <td className="px-4 py-2">
                <StatusBadge status={v.status} onChange={(s) => onStatusChange(v.id, s)} />
              </td>
              <td className={cn("px-4 py-2 text-xs font-medium", PRIORITY_COLOR[v.priority])}>{PRIORITY_LABEL[v.priority]}</td>
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

function NewVideoDialog({ onClose, clients }: { onClose: () => void; clients: { id: string; name: string }[] }) {
  const [form, setForm] = useState({ title: "", description: "", client_id: "", priority: "media" as VideoPriority, due_date: "" });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    setSaving(true);
    const { data: pkg } = await supabase.from("client_packages").select("id").eq("client_id", form.client_id).eq("status", "ativo").maybeSingle();
    const { error } = await supabase.from("videos").insert({
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
