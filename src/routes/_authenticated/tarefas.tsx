import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Calendar, LayoutGrid, AlertCircle, Repeat, Trash2 } from "lucide-react";
import { DueDatePopover, formatDue } from "@/components/due-date-popover";
import { DeleteAction } from "@/components/delete-action";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { daysUntil } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tarefas")({
  component: TarefasPage,
  head: () => ({ meta: [{ title: "Tarefas — AlvasharFlow" }] }),
});

type TaskStatus = "aberta" | "concluida";
type TaskPriority = "baixa" | "media" | "alta" | "urgente";
type TaskCategory = "financeiro" | "atendimento" | "marketing" | "edicao" | "administrativo" | "geral";
type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

const STATUS_COLS: { id: TaskStatus; label: string }[] = [
  { id: "aberta", label: "A Fazer" },
  { id: "concluida", label: "Concluído" },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
const PRIORITY_ORDER: Record<TaskPriority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
const PRIORITY_TINT: Record<TaskPriority, string> = {
  urgente: "text-destructive border-destructive/40 bg-destructive/10",
  alta: "text-[oklch(0.78_0.16_75)] border-[oklch(0.78_0.16_75)]/40 bg-[oklch(0.78_0.16_75)]/10",
  media: "text-primary border-primary/30 bg-primary/10",
  baixa: "text-muted-foreground border-border bg-muted/40",
};
const CATEGORY_LABEL: Record<TaskCategory, string> = {
  financeiro: "Financeiro", atendimento: "Atendimento", marketing: "Marketing",
  edicao: "Edição", administrativo: "Administrativo", geral: "Geral",
};
const RECURRENCE_LABEL: Record<TaskRecurrence, string> = { none: "Nenhuma", daily: "Diária", weekly: "Semanal", monthly: "Mensal" };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  recurrence: TaskRecurrence;
  due_date: string | null;
  due_time: string | null;
  client_id: string | null;
  assignee_id: string | null;
  clients: { name: string } | null;
};

function TarefasPage() {
  const [view, setView] = useState<"kanban" | "agenda">("kanban");
  const [filterCat, setFilterCat] = useState<TaskCategory | "all">("all");
  const [filterPrio, setFilterPrio] = useState<TaskPriority | "all">("all");
  const [filterMine, setFilterMine] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const qc = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks")
        .select("id, title, description, status, priority, category, recurrence, due_date, due_time, client_id, assignee_id, clients(name)")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
  });

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (filterCat !== "all") list = list.filter((t) => t.category === filterCat);
    if (filterPrio !== "all") list = list.filter((t) => t.priority === filterPrio);
    if (filterMine && currentUser) list = list.filter((t) => t.assignee_id === currentUser.id);
    list = [...list].sort((a, b) => {
      const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (p !== 0) return p;
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    });
    return list;
  }, [tasks, filterCat, filterPrio, filterMine, currentUser]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tarefa excluída"); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Tarefas"
        subtitle="Organização do seu dia a dia"
        actions={<NewTaskDialog />}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="mr-1 h-3.5 w-3.5" />Kanban</TabsTrigger>
            <TabsTrigger value="agenda"><Calendar className="mr-1 h-3.5 w-3.5" />Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={filterCat} onValueChange={(v) => setFilterCat(v as TaskCategory | "all")}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPrio} onValueChange={(v) => setFilterPrio(v as TaskPriority | "all")}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={filterMine} onCheckedChange={(c) => setFilterMine(!!c)} />Só minhas
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : view === "kanban" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {STATUS_COLS.map((col) => {
            const items = filtered.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="rounded-lg border border-border bg-card/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-display text-sm font-semibold">{col.label}</p>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => <TaskCard key={t.id} task={t} onStatus={(s) => updateStatus.mutate({ id: t.id, status: s })} onDelete={() => remove.mutate(t.id)} />)}
                  {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nada aqui.</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AgendaView tasks={filtered} onStatus={(id, s) => updateStatus.mutate({ id, status: s })} onDelete={(id) => remove.mutate(id)} />
      )}
    </div>
  );
}

function TaskCard({ task, onStatus, onDelete }: { task: Task; onStatus: (s: TaskStatus) => void; onDelete: () => void }) {
  const d = daysUntil(task.due_date);
  const overdue = d !== null && d < 0 && task.status !== "concluida";
  const today = d === 0 && task.status !== "concluida";
  return (
    <Card className={cn("p-3", overdue && "border-destructive/50")}>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={task.status === "concluida"}
          onCheckedChange={(c) => onStatus(c ? "concluida" : "aberta")}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", task.status === "concluida" && "line-through text-muted-foreground")}>{task.title}</p>
          {task.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px]", PRIORITY_TINT[task.priority])}>{PRIORITY_LABEL[task.priority]}</Badge>
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[task.category]}</Badge>
            {task.recurrence !== "none" && (
              <Badge variant="outline" className="text-[10px]"><Repeat className="mr-1 h-2.5 w-2.5" />{RECURRENCE_LABEL[task.recurrence]}</Badge>
            )}
            {task.clients && <Badge variant="secondary" className="text-[10px]">{task.clients.name}</Badge>}
            <DueDatePopover
              table="tasks"
              ids={[task.id]}
              due={task.due_date}
              time={task.due_time}
              invalidate={[["tasks"], ["dashboard"]]}
            >
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1 text-[10px] transition hover:bg-muted",
                  overdue ? "text-destructive font-semibold" : today ? "text-[oklch(0.78_0.16_75)] font-semibold" : "text-muted-foreground",
                )}
              >
                {overdue && <AlertCircle className="h-2.5 w-2.5" />}
                {task.due_date ? formatDue(task.due_date, task.due_time) : "definir prazo"}
              </button>
            </DueDatePopover>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="ml-auto">
              <DeleteAction
                table="tasks"
                id={task.id}
                title={`Excluir a tarefa "${task.title}"?`}
                description="A tarefa será removida permanentemente."
                successMessage="Tarefa excluída"
                invalidate={[["tasks"]]}
              />
            </div>

          </div>
        </div>
      </div>
    </Card>
  );
}

function AgendaView({ tasks, onStatus, onDelete }: { tasks: Task[]; onStatus: (id: string, s: TaskStatus) => void; onDelete: (id: string) => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

  const buckets = {
    Hoje: tasks.filter((t) => t.due_date && new Date(t.due_date).toDateString() === today.toDateString()),
    Amanhã: tasks.filter((t) => t.due_date && new Date(t.due_date).toDateString() === tomorrow.toDateString()),
    "Esta semana": tasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
      return d > tomorrow && d <= weekEnd;
    }),
    Próximas: tasks.filter((t) => t.due_date && new Date(t.due_date) > weekEnd),
    "Sem data": tasks.filter((t) => !t.due_date),
    Atrasadas: tasks.filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== "concluida"),
  };

  return (
    <div className="mt-4 space-y-4">
      {Object.entries(buckets).map(([label, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={label}>
            <p className="mb-2 font-display text-xs uppercase tracking-wider text-muted-foreground">{label} · {items.length}</p>
            <div className="space-y-2">
              {items.map((t) => <TaskCard key={t.id} task={t} onStatus={(s) => onStatus(t.id, s)} onDelete={() => onDelete(t.id)} />)}
            </div>
          </div>
        );
      })}
      {tasks.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa.</Card>}
    </div>
  );
}

function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [category, setCategory] = useState<TaskCategory>("geral");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState<string>("none");
  const { data: currentUser } = useCurrentUser();
  const qc = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  async function save() {
    if (!title.trim() || !currentUser?.workspaceId) return;
    const { error } = await supabase.from("tasks").insert({
      workspace_id: currentUser.workspaceId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      category,
      recurrence,
      due_date: dueDate || null,
      client_id: clientId === "none" ? null : clientId,
      assignee_id: currentUser.id,
      created_by: currentUser.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada");
    setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setClientId("none");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Nova tarefa</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Recorrência</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as TaskRecurrence)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RECURRENCE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
