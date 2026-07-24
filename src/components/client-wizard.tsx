import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check, ArrowLeft, ArrowRight, User, Package, Send, Palette, StickyNote } from "lucide-react";
import { toast } from "sonner";
import type { PackageSize, DeliveryMethod } from "@/lib/video-workflow";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Dados", icon: User },
  { id: 2, label: "Plano", icon: Package },
  { id: 3, label: "Entrega", icon: Send },
  { id: 4, label: "Identidade", icon: Palette },
  { id: 5, label: "Notas", icon: StickyNote },
] as const;

type Form = {
  name: string; company: string; whatsapp: string; instagram: string; email: string;
  size: PackageSize; total_videos: number; price: string; payment_day: string;
  start_date: string; end_date: string;
  delivery_method: DeliveryMethod; delivery_link: string;
  logo_url: string; colors: string; fonts: string; references: string;
  notes: string;
};

const initialForm: Form = {
  name: "", company: "", whatsapp: "", instagram: "", email: "",
  size: "p10", total_videos: 10, price: "", payment_day: "",
  start_date: new Date().toISOString().slice(0, 10), end_date: "",
  delivery_method: "drive", delivery_link: "",
  logo_url: "", colors: "", fonts: "", references: "",
  notes: "",
};

export function ClientWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(initialForm);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function pickPackage(size: PackageSize) {
    const totals: Record<PackageSize, number> = { p10: 10, p20: 20, p30: 30, custom: form.total_videos || 10 };
    setForm((f) => ({ ...f, size, total_videos: totals[size] }));
  }

  async function submit() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); setStep(1); return; }
    setSaving(true);
    try {
      const { data: client, error: cErr } = await supabase.from("clients").insert({
        name: form.name.trim(),
        company: form.company || null,
        email: form.email || null,
        phone: form.whatsapp || null,
        whatsapp: form.whatsapp || null,
        instagram: form.instagram || null,
        delivery_method: form.delivery_method,
        delivery_link: form.delivery_link || null,
        logo_url: form.logo_url || null,
        brand_colors: form.colors ? form.colors.split(",").map((s) => s.trim()).filter(Boolean) : [],
        brand_fonts: form.fonts ? form.fonts.split(",").map((s) => s.trim()).filter(Boolean) : [],
        brand_references: form.references ? form.references.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        notes: form.notes || null,
      }).select().single();
      if (cErr) throw cErr;

      const { data: pack, error: pErr } = await supabase.from("client_packages").insert({
        client_id: client.id,
        size: form.size,
        total_videos: form.total_videos,
        price: form.price ? parseFloat(form.price.replace(",", ".")) : 0,
        payment_day: form.payment_day ? parseInt(form.payment_day, 10) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: "ativo",
      }).select().single();
      if (pErr) throw pErr;

      // Gerar slots de vídeo automaticamente conforme o pacote
      const n = Math.max(0, form.total_videos || 0);
      if (n > 0) {
        const rows = Array.from({ length: n }, (_, i) => ({
          client_id: client.id,
          package_id: pack.id,
          title: `Vídeo ${String(i + 1).padStart(2, "0")}`,
          status: "recebido" as const,
          priority: "media" as const,
          position: i,
        }));
        const { error: vErr } = await supabase.from("videos").insert(rows);
        if (vErr) throw vErr;
      }

      toast.success(`${form.name} cadastrado com pacote ativo`);
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Novo cliente</DialogTitle>
      </DialogHeader>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <button
              onClick={() => setStep(s.id)}
              className={cn(
                "flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition",
                step === s.id ? "bg-primary/15 text-primary" : step > s.id ? "text-foreground" : "text-muted-foreground hover:bg-muted/40",
              )}
            >
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                step > s.id ? "border-primary bg-primary text-primary-foreground" : step === s.id ? "border-primary text-primary" : "border-border",
              )}>
                {step > s.id ? <Check className="h-3 w-3" /> : s.id}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="h-px w-2 bg-border" />}
          </div>
        ))}
      </div>

      <div className="min-h-[280px] py-2">
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *" required><Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
            <Field label="Empresa"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" /></Field>
            <Field label="Instagram"><Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@usuario" /></Field>
            <Field label="Email" className="col-span-2"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {(["p10", "p20", "p30", "custom"] as PackageSize[]).map((s) => (
                <button key={s} onClick={() => pickPackage(s)} type="button"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border p-3 text-center transition",
                    form.size === s ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}>
                  <span className="font-display text-lg font-semibold">{s === "custom" ? "?" : s.slice(1)}</span>
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    {s === "custom" ? "Personalizado" : "vídeos"}
                  </span>
                </button>
              ))}
            </div>
            {form.size === "custom" && (
              <Field label="Quantidade de vídeos">
                <Input type="number" min={1} value={form.total_videos} onChange={(e) => set("total_videos", parseInt(e.target.value || "0", 10))} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor mensal (R$)"><Input inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1500,00" /></Field>
              <Field label="Dia de pagamento"><Input type="number" min={1} max={31} value={form.payment_day} onChange={(e) => set("payment_day", e.target.value)} placeholder="10" /></Field>
              <Field label="Data de início"><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
              <Field label="Data final"><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="Como o cliente envia os vídeos brutos?">
              <Select value={form.delivery_method} onValueChange={(v) => set("delivery_method", v as DeliveryMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="drive">Google Drive</SelectItem>
                  <SelectItem value="dropbox">Dropbox</SelectItem>
                  <SelectItem value="wetransfer">WeTransfer</SelectItem>
                  <SelectItem value="upload_interno">Upload interno</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Link">
              <Input value={form.delivery_link} onChange={(e) => set("delivery_link", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <Field label="URL do logo"><Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" /></Field>
            <Field label="Cores da marca (separadas por vírgula)"><Input value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="#FF0000, #0055FF" /></Field>
            <Field label="Fontes"><Input value={form.fonts} onChange={(e) => set("fonts", e.target.value)} placeholder="Inter, Space Grotesk" /></Field>
            <Field label="Referências / exemplos (um por linha)">
              <Textarea rows={3} value={form.references} onChange={(e) => set("references", e.target.value)} placeholder="https://youtube.com/..." />
            </Field>
          </div>
        )}

        {step === 5 && (
          <Field label="Observações"><Textarea rows={8} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Instruções gerais, preferências, tudo que a equipe precisa saber…" /></Field>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="mr-1 h-4 w-4" />Voltar
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep((s) => Math.min(5, s + 1))}>
            Próximo<ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Finalizar cadastro
          </Button>
        )}
      </div>
    </DialogContent>
  );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}{required && " *"}</Label>
      {children}
    </div>
  );
}
