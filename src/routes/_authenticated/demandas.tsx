import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, GripVertical, Trash2, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { formatDate } from "@/lib/format";

const STATUS = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "Em andamento" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Entregue" },
] as const;
type Status = typeof STATUS[number]["key"];

const searchSchema = z.object({ client: z.string().optional() });

export const Route = createFileRoute("/_authenticated/demandas")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/portal" });
  },
  component: DemandasPage,
  head: () => ({ meta: [{ title: "Demandas — Nexo" }] }),
});

function DemandasPage() {
  const { client: clientFilter } = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: demands, isLoading } = useQuery({
    queryKey: ["demands", clientFilter ?? "all"],
    queryFn: async () => {
      let q = supabase.from("demands").select("*, clients(name)").order("position", { ascending: true });
      if (clientFilter) q = q.eq("client_id", clientFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientsList } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("demands").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demands"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["demands"] }); toast.success("Demanda removida"); },
  });

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const id = e.active.id as string;
    const newStatus = e.over.id as Status;
    const d = demands?.find((x) => x.id === id);
    if (!d || d.status === newStatus) return;
    updateStatus.mutate({ id, status: newStatus });
  }

  const clientName = clientFilter ? clientsList?.find((c) => c.id === clientFilter)?.name : null;
  const active = activeId ? demands?.find((d) => d.id === activeId) : null;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Demandas"
        subtitle={clientName ? `Filtrando por ${clientName}` : "Arraste os cards entre as colunas"}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova demanda</Button></DialogTrigger>
            <NewDemandDialog onClose={() => setOpen(false)} clients={clientsList ?? []} presetClient={clientFilter} />
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {STATUS.map((s) => {
              const items = (demands ?? []).filter((d) => d.status === s.key);
              return <Column key={s.key} status={s.key} label={s.label} items={items} onDelete={(id) => del.mutate(id)} />;
            })}
          </div>
          <DragOverlay>
            {active && <DemandCard demand={active as any} isOverlay />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function Column({ status, label, items, onDelete }: { status: Status; label: string; items: any[]; onDelete: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`glass-card flex min-h-[400px] flex-col rounded-xl p-3 transition ${isOver ? "border-primary/60 bg-primary/5" : ""}`}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold tracking-widest uppercase">{label}</h3>
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex-1 space-y-2">
        {items.map((d) => <DemandCard key={d.id} demand={d} onDelete={() => onDelete(d.id)} />)}
      </div>
    </div>
  );
}

function DemandCard({ demand, onDelete, isOverlay }: { demand: any; onDelete?: () => void; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: demand.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`group rounded-lg border border-border bg-card p-3 transition ${isDragging ? "opacity-40" : ""} ${isOverlay ? "shadow-2xl ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button {...listeners} className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing" title="Arrastar">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{demand.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{demand.clients?.name}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${
              demand.priority === "high" ? "bg-destructive/15 text-destructive" :
              demand.priority === "medium" ? "bg-[oklch(0.78_0.16_75_/_0.15)] text-[oklch(0.78_0.16_75)]" :
              "bg-primary/15 text-primary"
            }`}>
              {demand.priority === "high" ? "Alta" : demand.priority === "medium" ? "Média" : "Baixa"}
            </span>
            {demand.due_date && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />{formatDate(demand.due_date)}
              </span>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function NewDemandDialog({ onClose, clients, presetClient }: { onClose: () => void; clients: { id: string; name: string }[]; presetClient?: string }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    client_id: presetClient ?? "",
    priority: "medium" as "low" | "medium" | "high",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    setLoading(true);
    const { error } = await supabase.from("demands").insert({
      title: form.title,
      description: form.description || null,
      client_id: form.client_id,
      priority: form.priority,
      due_date: form.due_date || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demanda criada");
    qc.invalidateQueries({ queryKey: ["demands"] });
    onClose();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova demanda</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t">Título *</Label>
          <Input id="t" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d">Descrição</Label>
          <Textarea id="d" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Prazo</Label>
            <Input id="due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
