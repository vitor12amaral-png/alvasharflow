import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteAction } from "@/components/delete-action";
import { Plus, Loader2, AlertCircle, UserPlus, MessageSquarePlus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRL, formatDate, naturalCompare } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  LEAD_STAGES, LEAD_SOURCES, LEAD_ACTIVITY_KINDS, FOLLOW_UP_ALERT_DAYS,
  isLeadOverdue, type Lead, type LeadStage,
} from "@/lib/leads";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Leads — CRM de novos clientes | AlvasharFlow" },
      { name: "description", content: "Acompanhe propostas, follow-ups e conversões de novos clientes da sua operação de vídeo." },
      { property: "og:title", content: "Leads — CRM de novos clientes | AlvasharFlow" },
      { property: "og:description", content: "Kanban de leads com alertas de follow-up e conversão em cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const emptyForm = {
  name: "", company: "", email: "", phone: "", source: "indicacao",
  estimated_value: "", stage: "novo" as LeadStage,
  last_contact_at: "", next_follow_up: "", notes: "",
};

function LeadsPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStage | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Lead | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Lead[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: LeadStage }) => {
      const { error } = await supabase.from("leads").update({ stage, last_contact_at: new Date().toISOString().slice(0, 10) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const list = leads ?? [];
  const overdue = useMemo(() => list.filter(isLeadOverdue), [list]);

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Leads"
        subtitle="Pessoas e empresas em processo de fechamento, antes de virarem clientes."
        actions={<Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />Novo lead</Button>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leads em aberto</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {list.filter((l) => l.stage !== "fechado" && l.stage !== "perdido").length}
          </p>
        </Card>
        <Card className={cn("p-4", overdue.length > 0 && "border-destructive/40")}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Follow-up pendente</p>
          <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold">
            {overdue.length}
            {overdue.length > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor em negociação</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatBRL(list.filter((l) => l.stage !== "fechado" && l.stage !== "perdido")
              .reduce((s, l) => s + (Number(l.estimated_value) || 0), 0))}
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {LEAD_STAGES.map((col) => {
          const items = list.filter((l) => l.stage === col.id).sort((a, b) => naturalCompare(a.name, b.name));
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const id = dragId; setDragId(null); setOver(null);
                if (id) move.mutate({ id, stage: col.id });
              }}
              className={cn(
                "rounded-xl border p-2.5 transition",
                over === col.id ? "border-primary bg-primary/5" : "border-border bg-card/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider">{col.label}</p>
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    dragging={dragId === l.id}
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    onOpen={() => setDetail(l)}
                    onEdit={() => setEditing(l)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-2 py-5 text-center text-[10px] text-muted-foreground">
                    vazio
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LeadFormDialog
        open={creating || !!editing}
        lead={editing}
        workspaceId={me?.workspaceId ?? null}
        userId={me?.id ?? null}
        onClose={() => { setCreating(false); setEditing(null); }}
      />

      <LeadDetailDialog lead={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function LeadCard({ lead, dragging, onDragStart, onDragEnd, onOpen, onEdit }: {
  lead: Lead; dragging: boolean; onDragStart: () => void; onDragEnd: () => void;
  onOpen: () => void; onEdit: () => void;
}) {
  const late = isLeadOverdue(lead);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "group cursor-grab rounded-lg border bg-card p-2.5 text-left transition active:cursor-grabbing lift hover:lift-hover",
        late ? "border-destructive/50" : "border-border",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{lead.name}</p>
          {lead.company && <p className="truncate text-[10px] text-muted-foreground">{lead.company}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {lead.estimated_value != null && (
              <Badge variant="outline" className="text-[10px]">{formatBRL(Number(lead.estimated_value))}</Badge>
            )}
            {late && <Badge variant="destructive" className="text-[10px]">follow-up</Badge>}
            {lead.next_follow_up && (
              <span className="text-[10px] text-muted-foreground">{formatDate(lead.next_follow_up)}</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-[10px] text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
        >
          editar
        </button>
      </div>
    </div>
  );
}

function LeadFormDialog({ open, lead, workspaceId, userId, onClose }: {
  open: boolean; lead: Lead | null; workspaceId: string | null; userId: string | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Sincroniza o formulário com o lead selecionado (ou limpa ao criar).
  const key = lead?.id ?? (open ? "new" : null);
  if (open && key !== loadedFor) {
    setLoadedFor(key);
    setForm(lead ? {
      name: lead.name, company: lead.company ?? "", email: lead.email ?? "", phone: lead.phone ?? "",
      source: lead.source ?? "indicacao", estimated_value: lead.estimated_value != null ? String(lead.estimated_value) : "",
      stage: lead.stage, last_contact_at: lead.last_contact_at ?? "", next_follow_up: lead.next_follow_up ?? "",
      notes: lead.notes ?? "",
    } : { ...emptyForm });
  }
  if (!open && loadedFor !== null) setLoadedFor(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) return toast.error("Informe o nome do lead");
    if (!lead && !workspaceId) return toast.error("Workspace indisponível");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source || null,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      stage: form.stage,
      last_contact_at: form.last_contact_at || null,
      next_follow_up: form.next_follow_up || null,
      notes: form.notes.trim() || null,
    };
    const { error } = lead
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert({ ...payload, workspace_id: workspaceId!, created_by: userId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(lead ? "Lead atualizado" : "Lead criado");
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">{lead ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
        <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
          <Field label="Nome *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Empresa"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Telefone / WhatsApp"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" /></Field>
          <Field label="Origem">
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor estimado (R$)">
            <Input type="number" min={0} step="0.01" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} />
          </Field>
          <Field label="Estágio">
            <Select value={form.stage} onValueChange={(v) => set("stage", v as LeadStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Último contato"><Input type="date" value={form.last_contact_at} onChange={(e) => set("last_contact_at", e.target.value)} /></Field>
          <Field label="Próximo follow-up"><Input type="date" value={form.next_follow_up} onChange={(e) => set("next_follow_up", e.target.value)} /></Field>
          <Field label="Observações" className="col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const [kind, setKind] = useState("mensagem");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: activities } = useQuery({
    queryKey: ["lead-activities", lead?.id],
    enabled: !!lead,
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_activities").select("*")
        .eq("lead_id", lead!.id).order("happened_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function addActivity() {
    if (!lead || !me?.workspaceId) return;
    if (!notes.trim()) return toast.error("Escreva a observação");
    setBusy(true);
    const { error } = await supabase.from("lead_activities").insert({
      workspace_id: me.workspaceId, lead_id: lead.id, kind, notes: notes.trim(), author_id: me.id,
    });
    if (!error) {
      await supabase.from("leads").update({ last_contact_at: new Date().toISOString().slice(0, 10) }).eq("id", lead.id);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    setNotes("");
    toast.success("Interação registrada");
    qc.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  /** Cria o cliente a partir do lead, mantendo o lead como histórico convertido. */
  async function convert() {
    if (!lead || !me?.workspaceId) return;
    if (lead.converted_client_id) {
      navigate({ to: "/clientes/$clientId", params: { clientId: lead.converted_client_id } });
      return;
    }
    setBusy(true);
    const { data: created, error } = await supabase.from("clients").insert({
      workspace_id: me.workspaceId,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      whatsapp: lead.phone,
      notes: lead.notes,
      status: "ativo",
    }).select("id").single();
    if (error) { setBusy(false); return toast.error(error.message); }
    await supabase.from("leads").update({ stage: "fechado", converted_client_id: created.id }).eq("id", lead.id);
    setBusy(false);
    toast.success("Lead convertido em cliente");
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    onClose();
    navigate({ to: "/clientes/$clientId", params: { clientId: created.id } });
  }

  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        {lead && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{lead.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{LEAD_STAGES.find((s) => s.id === lead.stage)?.label}</Badge>
                {lead.company && <span>{lead.company}</span>}
                {lead.phone && <span>{lead.phone}</span>}
                {lead.email && <span>{lead.email}</span>}
                {lead.estimated_value != null && <span>{formatBRL(Number(lead.estimated_value))}</span>}
              </div>

              {lead.next_follow_up && (
                <p className={cn("text-xs", isLeadOverdue(lead) ? "text-destructive" : "text-muted-foreground")}>
                  Follow-up: {formatDate(lead.next_follow_up)}
                  {isLeadOverdue(lead) && " — atrasado"}
                </p>
              )}
              {lead.notes && <p className="rounded-md border border-border p-2 text-xs">{lead.notes}</p>}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={convert} disabled={busy}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  {lead.converted_client_id ? "Abrir cliente" : "Converter em cliente"}
                </Button>
                <DeleteAction
                  table="leads"
                  id={lead.id}
                  variant="button"
                  label="Excluir lead"
                  title={`Excluir ${lead.name}?`}
                  description="O lead e o histórico de interações dele serão removidos."
                  successMessage="Lead excluído"
                  invalidate={[["leads"], ["dashboard"]]}
                  onDeleted={onClose}
                />
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 font-display text-xs font-semibold">Histórico de contato</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-36">
                    <Label className="text-[10px] text-muted-foreground">Tipo</Label>
                    <Select value={kind} onValueChange={setKind}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_ACTIVITY_KINDS.map((k) => <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <Label className="text-[10px] text-muted-foreground">Observação</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumo do contato…" />
                  </div>
                  <Button size="sm" variant="outline" onClick={addActivity} disabled={busy}>
                    <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />Registrar
                  </Button>
                </div>

                <div className="mt-3 space-y-1.5">
                  {(activities ?? []).length === 0 && (
                    <p className="py-3 text-center text-[11px] text-muted-foreground">Nenhum contato registrado.</p>
                  )}
                  {(activities ?? []).map((a) => (
                    <div key={a.id} className="rounded-md border border-border px-2.5 py-1.5 text-xs">
                      <span className="font-medium">{LEAD_ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label ?? a.kind}</span>
                      <span className="text-muted-foreground"> · {formatDate(a.happened_at)}</span>
                      <p className="mt-0.5 text-muted-foreground">{a.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Leads sem contato há mais de {FOLLOW_UP_ALERT_DAYS} dias ou com follow-up vencido ficam destacados no quadro.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

