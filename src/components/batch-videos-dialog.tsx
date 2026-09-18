import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CircleCheck, Info, Loader2, Rows3, Layers3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { STAGE_LABEL, PRIORITY_LABEL } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { resolveClientPricing, type PricingInfo } from "@/lib/pricing";
import { formatBRL, naturalCompare } from "@/lib/format";

export type ClientMin = { id: string; name: string; parent_client_id: string | null };

const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];

function defaultDueForMonth(ym?: string) {
  if (!ym) return "";
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (ym === current) return "";
  // Mês futuro/passado: sugere o primeiro dia do mês exibido.
  return `${ym}-01`;
}

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
  const [dueDate, setDueDate] = useState(defaultDueForMonth(month ?? currentMonth));
  const [saving, setSaving] = useState(false);
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

  return (
    <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0">
      <DialogHeader className="border-b border-border/70 px-6 py-5 pr-14">
        <DialogTitle className="text-2xl">Nova leva de vídeos</DialogTitle>
        <p className="text-sm text-muted-foreground">Configure o lote e confira o resumo antes de criar.</p>
        <div className="mt-4 grid grid-cols-4 gap-2" aria-hidden>
          {['Cliente', 'Conteúdo', 'Organização', 'Resumo'].map((step, index) => (
            <div key={step} className="space-y-1.5">
              <div className={cn("h-1 rounded-full", index < 2 ? "bg-primary shadow-[0_0_10px_-3px_var(--primary)]" : "bg-muted")} />
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", index < 2 ? "text-primary" : "text-muted-foreground/55")}>{step}</span>
            </div>
          ))}
        </div>
      </DialogHeader>
      <form onSubmit={submit}>
        <div className="space-y-6 px-6 py-5">
        {(templates ?? []).length > 0 && <div className="space-y-2">
          <SectionLabel number="01">Modelo</SectionLabel>
          <Select value={templateId} onValueChange={applyTemplate}><SelectTrigger><SelectValue placeholder="Começar sem template" /></SelectTrigger><SelectContent>{templates?.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select>
        </div>}
        <section className="space-y-3">
          <SectionLabel number="01">Cliente e modo de entrada</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.parent_client_id ? `↳ ${c.name}` : c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de entrada</Label>
              <div className="control-surface flex h-10 items-center rounded-lg border p-1">
                <ModeBtn active={mode === "lista"} onClick={() => setMode("lista")} icon={<Rows3 className="h-3.5 w-3.5" />} label="Lista" />
                <ModeBtn active={mode === "quantidade"} onClick={() => setMode("quantidade")} icon={<Layers3 className="h-3.5 w-3.5" />} label="Quantidade" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel number="02">Conteúdo</SectionLabel>
          {mode === "lista" ? (
            <div className="space-y-1.5">
              <Label>Títulos (um por linha)</Label>
              <Textarea rows={5} value={titles} onChange={(e) => setTitles(e.target.value)} placeholder={"Reels 01\nReels 02\nCorte podcast"} />
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <div className="space-y-1.5"><Label>Prefixo da leva</Label><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Ex: Reels agosto" /></div>
              <div className="space-y-1.5"><Label>Qtd.</Label><Input className="text-center font-semibold" type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionLabel number="03">Organização e prazos</SectionLabel>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Situação"><Select value={status} onValueChange={(v) => setStatus(v as VideoStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Prioridade"><Select value={priority} onValueChange={(v) => setPriority(v as VideoPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["baixa", "media", "alta", "urgente"] as VideoPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Mês da leva"><Input type="month" value={selectedMonth} onChange={(e) => { const next = e.target.value; setSelectedMonth(next); setDueDate((current) => current && current.slice(0, 7) === next ? current : defaultDueForMonth(next)); }} /></Field>
            <Field label="Prazo"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          </div>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Info className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-foreground/85"><span className="font-semibold text-primary">{parsed.length || 0} vídeos</span>{parsed.length > 0 ? ` serão criados como ${parsed.slice(0, 3).join(", ")}${parsed.length > 3 ? "…" : ""}` : " — defina os títulos ou a quantidade."}</p>
              {clientId && <p className="mt-1 text-xs text-muted-foreground">{pricing && pricing.pricePerVideo > 0 ? <>Valor previsto: <span className="font-semibold text-success">{formatBRL(estimated)}</span> · {formatBRL(pricing.pricePerVideo)} por vídeo</> : "Sem valor por vídeo definido para este cliente."}</p>}
            </div>
          </div>
        </section>
        </div>
        <DialogFooter className="border-t border-border/70 bg-background/30 px-6 py-5">
          <Button className="h-11 w-full sm:w-auto sm:min-w-52" type="submit" disabled={saving || parsed.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
            Criar {parsed.length || ""} vídeos agora
            {!saving && <ArrowRight className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
      active ? "bg-primary/12 font-semibold text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_20%,transparent)]" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    )}>{icon}{label}</button>
  );
}

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"><span className="text-primary">{number}</span><span>{children}</span><span className="h-px flex-1 bg-border/70" /></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><Label>{label}</Label>{children}</div>;
}
