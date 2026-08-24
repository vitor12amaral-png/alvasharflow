import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { suggestPerVideo } from "@/lib/pricing";
import { formatBRL } from "@/lib/format";
import type { PackageSize } from "@/lib/video-workflow";
import type { Database } from "@/integrations/supabase/types";

type PackageStatus = Database["public"]["Enums"]["package_status"];

export type EditablePackage = {
  id: string;
  size: string;
  total_videos: number;
  videos_used: number;
  price: number | string;
  price_per_video?: number | string | null;
  payment_day: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
};

export function EditPackageDialog({ pack, onSaved }: { pack: EditablePackage; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    size: pack.size as PackageSize,
    total_videos: String(pack.total_videos ?? 0),
    videos_used: String(pack.videos_used ?? 0),
    price: String(pack.price ?? "").replace(".", ","),
    price_per_video: String(pack.price_per_video ?? "").replace(".", ","),
    payment_day: pack.payment_day ? String(pack.payment_day) : "",
    start_date: pack.start_date ?? "",
    end_date: pack.end_date ?? "",
    status: pack.status as PackageStatus,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function pickSize(size: PackageSize) {
    const totals: Record<PackageSize, string> = { p10: "10", p20: "20", p30: "30", custom: form.total_videos };
    setForm((f) => ({ ...f, size, total_videos: totals[size] }));
  }

  const num = (v: string) => parseFloat((v || "").replace(",", ".")) || 0;
  const autoPerVideo = suggestPerVideo(num(form.price_per_video), num(form.price), parseInt(form.total_videos || "0", 10));

  /** Chips de prazo: sem data final (indeterminado) ou +N meses a partir do início. */
  function setDuration(months: number | null) {
    if (months === null) { set("end_date", ""); return; }
    const base = form.start_date ? new Date(form.start_date + "T00:00:00") : new Date();
    const end = new Date(base);
    end.setMonth(end.getMonth() + months);
    set("end_date", end.toISOString().slice(0, 10));
  }

  async function save() {
    const total = parseInt(form.total_videos || "0", 10);
    if (!Number.isFinite(total) || total < 0) { toast.error("Número de vídeos inválido"); return; }
    setSaving(true);
    const { error } = await supabase.from("client_packages").update({
      size: form.size,
      total_videos: total,
      videos_used: Math.max(0, parseInt(form.videos_used || "0", 10) || 0),
      price: form.price ? num(form.price) : 0,
      price_per_video: autoPerVideo || null,
      payment_day: form.payment_day ? parseInt(form.payment_day, 10) : null,
      start_date: form.start_date || new Date().toISOString().slice(0, 10),
      end_date: form.end_date || null,
      status: form.status,
    }).eq("id", pack.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pacote atualizado");
    setOpen(false);
    onSaved?.();
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" aria-label="Editar pacote" className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Editar pacote</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(["p10", "p20", "p30", "custom"] as PackageSize[]).map((s) => (
              <button key={s} type="button" onClick={() => pickSize(s)}
                className={cn(
                  "flex flex-col items-center rounded-lg border p-2.5 transition",
                  form.size === s ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                )}>
                <span className="font-display text-base font-semibold">{s === "custom" ? "?" : s.slice(1)}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s === "custom" ? "Custom" : "vídeos"}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Total de vídeos"><Input type="number" min={0} value={form.total_videos} onChange={(e) => set("total_videos", e.target.value)} /></F>
            <F label="Vídeos usados"><Input type="number" min={0} value={form.videos_used} onChange={(e) => set("videos_used", e.target.value)} /></F>
            <F label="Valor (R$)"><Input inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} /></F>
            <F label="Valor por vídeo (R$)">
              <Input
                inputMode="decimal"
                placeholder={autoPerVideo ? formatBRL(autoPerVideo) : "auto"}
                value={form.price_per_video}
                onChange={(e) => set("price_per_video", e.target.value)}
              />
            </F>
            <F label="Dia de pagamento"><Input type="number" min={1} max={31} value={form.payment_day} onChange={(e) => set("payment_day", e.target.value)} /></F>
            <F label="Início"><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></F>
            <F label="Fim"><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></F>
            <F label="Prazo rápido" className="col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Indeterminado", months: null },
                  { label: "1 mês", months: 1 },
                  { label: "3 meses", months: 3 },
                  { label: "6 meses", months: 6 },
                  { label: "1 ano", months: 12 },
                ].map((c) => (
                  <button key={c.label} type="button" onClick={() => setDuration(c.months)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition",
                      (c.months === null ? !form.end_date : false)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}>{c.label}</button>
                ))}
              </div>
            </F>
            <div className="col-span-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              Cada vídeo desta leva vale <span className="font-semibold text-foreground">{formatBRL(autoPerVideo)}</span>
              {form.price_per_video ? " (definido manualmente)" : " (calculado pelo valor total ÷ vídeos)"}.
            </div>
            <F label="Status" className="col-span-2">

              <Select value={form.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="renovado">Renovado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
