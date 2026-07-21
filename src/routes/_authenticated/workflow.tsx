import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Calendar, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { VIDEO_STAGES, PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workflow")({
  component: WorkflowPage,
  head: () => ({ meta: [{ title: "Workflow — Cortex" }] }),
});

function WorkflowPage() {
  const [open, setOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const qc = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos-workflow", clientFilter],
    queryFn: async () => {
      let q = supabase.from("videos").select("*, clients(name), profiles:editor_id(full_name)").order("position");
      if (clientFilter !== "all") q = q.eq("client_id", clientFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VideoStatus }) => {
      const { error } = await supabase.from("videos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["videos-workflow", clientFilter] });
      const prev = qc.getQueryData(["videos-workflow", clientFilter]);
      qc.setQueryData(["videos-workflow", clientFilter], (old: unknown) => {
        const list = (old as { id: string; status: VideoStatus }[]) ?? [];
        return list.map((v) => v.id === id ? { ...v, status } : v);
      });
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

  function onDragEnd(e: DragEndEvent) {
    const id = e.active.id as string;
    const to = e.over?.id as VideoStatus | undefined;
    if (!to) return;
    const v = videos?.find((v) => v.id === id);
    if (!v || v.status === to) return;
    move.mutate({ id, status: to });
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col md:h-screen">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageHeader
          title="Workflow"
          subtitle="Arraste os vídeos entre estágios"
          actions={
            <div className="flex items-center gap-2">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
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

      <div className="mt-4 flex-1 overflow-x-auto px-6 pb-6 md:px-8">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex h-full gap-3">
              {VIDEO_STAGES.map((stage) => {
                const items = (videos ?? []).filter((v) => v.status === stage.id);
                return <Column key={stage.id} id={stage.id} label={stage.label} accent={stage.accent} count={items.length}>
                  {items.map((v) => (
                    <VideoCard key={v.id} id={v.id} title={v.title} client={v.clients?.name}
                      editor={v.profiles?.full_name} due={v.due_date} priority={v.priority as VideoPriority} />
                  ))}
                </Column>;
              })}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function Column({ id, label, accent, count, children }: { id: string; label: string; accent: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(
      "flex h-full w-64 shrink-0 flex-col rounded-lg border border-border bg-card/40 transition",
      isOver && "border-primary/60 bg-primary/5",
    )}>
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
        <span className="ml-auto text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">{children}</div>
    </div>
  );
}

function VideoCard({ id, title, client, editor, due, priority }: {
  id: string; title: string; client?: string; editor?: string | null; due: string | null; priority: VideoPriority;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "cursor-grab rounded-md border border-border bg-card p-2.5 text-xs shadow-sm transition active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <p className="font-medium leading-snug">{title}</p>
      {client && <p className="mt-1 truncate text-[10px] text-muted-foreground">{client}</p>}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className={cn("font-semibold", PRIORITY_COLOR[priority])}>{PRIORITY_LABEL[priority]}</span>
        {due && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(due)}</span>}
        {editor && <span className="ml-auto inline-flex items-center gap-1 truncate"><UserIcon className="h-3 w-3" />{editor.split(" ")[0]}</span>}
      </div>
    </div>
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
