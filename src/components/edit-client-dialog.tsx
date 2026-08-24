import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DeliveryMethod } from "@/lib/video-workflow";

export type EditableClient = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  instagram: string | null;
  status: string;
  pause_reason: string | null;
  pause_until: string | null;
  delivery_method: string | null;
  delivery_link: string | null;
  logo_url: string | null;
  notes: string | null;
};

export function EditClientDialog({ client, onSaved }: { client: EditableClient; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: client.name ?? "",
    company: client.company ?? "",
    email: client.email ?? "",
    whatsapp: client.whatsapp ?? client.phone ?? "",
    instagram: client.instagram ?? "",
    status: client.status ?? "ativo",
    pause_reason: client.pause_reason ?? "",
    pause_until: client.pause_until ?? "",
    delivery_method: (client.delivery_method ?? "drive") as DeliveryMethod,
    delivery_link: client.delivery_link ?? "",
    logo_url: client.logo_url ?? "",
    notes: client.notes ?? "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const paused = form.status === "pausado";
    const { error } = await supabase.from("clients").update({
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      phone: form.whatsapp.trim() || null,
      instagram: form.instagram.trim() || null,
      status: form.status,
      pause_reason: paused ? (form.pause_reason.trim() || null) : null,
      pause_until: paused ? (form.pause_until || null) : null,
      delivery_method: form.delivery_method,
      delivery_link: form.delivery_link.trim() || null,
      logo_url: form.logo_url.trim() || null,
      notes: form.notes.trim() || null,
    }).eq("id", client.id);
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Ao encerrar o cliente, oferece arquivar os pacotes que ainda estão ativos.
    if (form.status === "encerrado" && client.status !== "encerrado") {
      const { data: actives } = await supabase
        .from("client_packages").select("id").eq("client_id", client.id).eq("status", "ativo");
      if (actives?.length && confirm(`Este cliente tem ${actives.length} pacote(s) ativo(s). Arquivar (sem excluir)?`)) {
        const { error: pErr } = await supabase
          .from("client_packages")
          .update({ status: "arquivado" as never })
          .in("id", actives.map((p) => p.id));
        if (pErr) toast.error(pErr.message);
        else toast.success("Pacotes arquivados");
      }
    }

    setSaving(false);
    toast.success("Perfil atualizado");
    setOpen(false);
    onSaved?.();
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Editar perfil do cliente</DialogTitle></DialogHeader>
        <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
          <F label="Nome *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></F>
          <F label="Empresa"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></F>
          <F label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" /></F>
          <F label="Instagram"><Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@usuario" /></F>
          <F label="Email" className="col-span-2"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></F>
          <F label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Forma de entrega">
            <Select value={form.delivery_method} onValueChange={(v) => set("delivery_method", v as DeliveryMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drive">Google Drive</SelectItem>
                <SelectItem value="dropbox">Dropbox</SelectItem>
                <SelectItem value="wetransfer">WeTransfer</SelectItem>
                <SelectItem value="upload_interno">Upload interno</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Link de entrega" className="col-span-2"><Input value={form.delivery_link} onChange={(e) => set("delivery_link", e.target.value)} placeholder="https://…" /></F>
          <F label="URL do logo" className="col-span-2"><Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" /></F>
          <F label="Observações" className="col-span-2"><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></F>
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
