import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CircleCheck, Info, Loader2, Rows3, Layers3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { STAGE_LABEL, PRIORITY_LABEL } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { resolveClientPricing, type PricingInfo } from "@/lib/pricing";
import { formatBRL, naturalCompare } from "@/lib/format";
import { MonthDeadlinePicker } from "@/components/month-deadline-picker";

export type ClientMin = { id: string; name: string; parent_client_id: string | null };

const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];

export function BatchVideosDialog({ onClose, clients: clientsProp, defaultClientId, month }: {
  onClose: () => void;
  clients?: ClientMin[];
  defaultClientId?: string;
  month?: string;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [mode, setMode] = useState<"lista" | "quantidade">("lista");
  const [titles, setTitles] = useState("");
  const [prefix, setPrefix] = useState("");
  const [qty, setQty] = useState(5);
  const [status, setStatus] = useState<VideoStatus>("recebido");
  const [priority, setPriority] = useState<VideoPriority>("media");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(month ?? currentMonth);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(defaultClientId ? 1 : 0);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [templateChecklist, setTemplateChecklist] = useState<{ label: string; done: boolean }[]>([]);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const { data: fetched } = useQuery({
    queryKey: ["clients-min"],
    enabled: !clientsProp,
    queryFn: async () =>
      ((await supabase.from("clients").select("id, name, parent_client_id").order("name")).data ?? []) as ClientMin[],
  });
  const clients = useMemo(
    () => [...(clientsProp ?? fetched ?? [])].sort((a, b) => naturalCompare(a.name, b.name)),
    [clientsProp, fetched],
  );
  const { data: templates } = useQuery({
    queryKey: ["project-templates", me?.workspaceId],
    enabled: !!me?.workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("project_templates").select("id, name, default_status, default_priority, due_in_days, titles, checklist").eq("workspace_id", me?.workspaceId ?? "").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates?.find((item) => item.id === id);
    if (!template) return;
    const templateTitles = Array.isArray(template.titles) ? template.titles.map(String) : [];
    if (templateTitles.length) { setMode("lista"); setTitles(templateTitles.join("\n")); }
    setStatus(template.default_status as VideoStatus);
    setPriority(template.default_priority as VideoPriority);
    setTemplateChecklist(Array.isArray(template.checklist) ? template.checklist.map((item: any) => ({ label: String(item?.label ?? item), done: false })) : []);
    if (template.due_in_days != null) {
      const date = new Date(); date.setDate(date.getDate() + Number(template.due_in_days));
      setDueDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
    }
  }

  useEffect(() => {
    let alive = true;
    if (!clientId) { setPricing(null); return; }
    resolveClientPricing(clientId).then((p) => { if (alive) setPricing(p); });
    return () => { alive = false; };
  }, [clientId]);

  const parsed = useMemo(() => {
    if (mode === "lista") return titles.split("\n").map((t) => t.trim()).filter(Boolean);
    const base = prefix.trim() || "Vídeo";
    const n = Math.max(1, Math.min(100, Number(qty) || 1));
    return Array.from({ length: n }, (_, i) => `${base} ${String(i + 1).padStart(2, "0")}`);
  }, [mode, titles, prefix, qty]);

  const estimated = (pricing?.pricePerVideo ?? 0) * parsed.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { toast.error("Selecione um cliente"); return; }
    if (!me?.workspaceId) { toast.error("Workspace não encontrado"); return; }
    if (parsed.length === 0) { toast.error("Adicione ao menos um título"); return; }
    setSaving(true);
    const info = pricing ?? (await resolveClientPricing(clientId));
    const batchId = crypto.randomUUID();
    const label = (mode === "quantidade" && prefix.trim())
      ? prefix.trim()
      : `Leva ${new Date().toLocaleDateString("pt-BR")}`;
    const rows = parsed.map((title) => ({
      workspace_id: me.workspaceId!,
      client_id: clientId,
      title,
      status,
      priority,
      due_date: dueDate || null,
      competence_month: `${selectedMonth}-01`,
      package_id: info.packageId,
      checklist: templateChecklist,
      unit_price: info.pricePerVideo > 0 ? info.pricePerVideo : null,
      batch_id: batchId,
      batch_label: label,
    }));

    const { error } = await supabase.from("videos").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    const total = info.pricePerVideo * rows.length;
    const name = info.clientName || "cliente";
    toast.success(
      total > 0
        ? `${rows.length} vídeos criados — ${formatBRL(total)} gerados no ${info.source === "avulso" ? "avulso" : "pacote"} de ${name}`
        : `${rows.length} vídeos criados para ${name} (defina o valor por vídeo para calcular a receita)`,
    );
    ["videos-workflow", "clients-video-counts", "dashboard", "fila-videos", "packages"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
    onClose();
  }

  const STEPS = ["Cliente", "Conteúdo", "Organização", "Resumo"] as const;
  const canAdvance = [!!clientId, parsed.length > 0, true, true];
  const go = (target: number) => {
    for (let i = 0; i < target; i++) {
      if (!canAdvance[i]) {
        toast.error(i === 0 ? "Selecione um cliente" : "Adicione ao menos um título");
        setStep(i);
        return;
      }
    }
    setStep(target);
  };
  const clientName = clients.find((c) => c.id === clientId)?.name;
  const monthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0">
      <DialogHeader className="border-b border-border/70 px-6 py-5 pr-14">
        <DialogTitle className="text-2xl">Nova leva de vídeos</DialogTitle>
        <p className="text-sm text-muted-foreground">Etapa {step + 1} de 4 · {STEPS[step]}</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((label, index) => (
            <button key={label} type="button" onClick={() => go(index)} className="space-y-1.5 text-left" aria-current={index === step ? "step" : undefined}>
              <div className={cn("h-1 rounded-full transition-colors duration-300", index <= step ? "bg-primary" : "bg-muted")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors", index === step ? "text-primary" : index < step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </button>
          ))}
        </div>
      </DialogHeader>
      <form onSubmit={(e) => { if (step < 3) { e.preventDefault(); go(step + 1); return; } submit(e); }}>
        <div key={step} className="min-h-[260px] space-y-5 px-6 py-5 animate-in fade-in slide-in-from-right-2 duration-200">
          {step === 0 && (
            <>
              {(templates ?? []).length > 0 && <Field label="Modelo (opcional)">
                <Select value={templateId} onValueChange={applyTemplate}><SelectTrigger><SelectValue placeholder="Começar sem modelo" /></SelectTrigger><SelectContent>{templates?.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select>
              </Field>}
              <Field label="Cliente *">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.parent_client_id ? `↳ ${c.name}` : c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Como quer adicionar os vídeos?">
                <div className="control-surface flex h-10 items-center rounded-lg border p-1">
                  <ModeBtn active={mode === "lista"} onClick={() => setMode("lista")} icon={<Rows3 className="h-3.5 w-3.5" />} label="Lista de títulos" />
                  <ModeBtn active={mode === "quantidade"} onClick={() => setMode("quantidade")} icon={<Layers3 className="h-3.5 w-3.5" />} label="Quantidade" />
                </div>
              </Field>
            </>
          )}
          {step === 1 && (mode === "lista" ? (
            <Field label="Títulos (um por linha)">
              <Textarea rows={8} autoFocus value={titles} onChange={(e) => setTitles(e.target.value)} placeholder={"Reels 01\nReels 02\nCorte podcast"} />
            </Field>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <Field label="Nome da leva"><Input autoFocus value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Ex: Reels novembro" /></Field>
              <Field label="Qtd."><Input className="text-center font-semibold" type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
            </div>
          ))}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Situação"><Select value={status} onValueChange={(v) => setStatus(v as VideoStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Prioridade"><Select value={priority} onValueChange={(v) => setPriority(v as VideoPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["baixa", "media", "alta", "urgente"] as VideoPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}</SelectContent></Select></Field>
              </div>
              <MonthDeadlinePicker month={selectedMonth} dueDate={dueDate} onMonthChange={setSelectedMonth} onDueDateChange={setDueDate} />
            </>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <SummaryItem label="Cliente" value={clientName ?? "—"} />
                <SummaryItem label="Vídeos" value={String(parsed.length)} />
                <SummaryItem label="Mês da leva" value={monthLabel} />
                <SummaryItem label="Prazo" value={dueDate ? new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"} />
                <SummaryItem label="Situação" value={STAGE_LABEL[status]} />
                <SummaryItem label="Valor previsto" value={pricing && pricing.pricePerVideo > 0 ? formatBRL(estimated) : "Sem valor definido"} />
              </dl>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-foreground">{parsed.slice(0, 4).join(", ")}{parsed.length > 4 ? ` e mais ${parsed.length - 4}` : ""}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-row justify-between gap-2 border-t border-border/70 bg-background/30 px-6 py-4 sm:justify-between">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < 3 ? (
            <Button type="submit" className="min-w-36">Avançar <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button className="h-11 min-w-52" type="submit" disabled={saving || parsed.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
              Criar {parsed.length || ""} vídeos
            </Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/70 bg-card/50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-1 truncate font-medium">{value}</dd></div>;
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
      active ? "bg-primary/12 font-semibold text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_20%,transparent)]" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    )}>{icon}{label}</button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><Label>{label}</Label>{children}</div>;
}
