import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Rows3, Layers3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { STAGE_LABEL, PRIORITY_LABEL } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { resolveClientPricing, type PricingInfo } from "@/lib/pricing";
import { formatBRL, naturalCompare } from "@/lib/format";

export type ClientMin = { id: string; name: string; parent_client_id: string | null };

const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];

export function BatchVideosDialog({ onClose, clients: clientsProp, defaultClientId }: {
  onClose: () => void;
  clients?: ClientMin[];
  defaultClientId?: string;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [mode, setMode] = useState<"lista" | "quantidade">("lista");
  const [titles, setTitles] = useState("");
  const [prefix, setPrefix] = useState("");
  const [qty, setQty] = useState(5);
  const [status, setStatus] = useState<VideoStatus>("recebido");
  const [priority, setPriority] = useState<VideoPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
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
    const rows = parsed.map((title) => ({
      workspace_id: me.workspaceId!,
      client_id: clientId,
      title,
      status,
      priority,
      due_date: dueDate || null,
      package_id: info.packageId,
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
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Nova leva de vídeos</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.parent_client_id ? `↳ ${c.name}` : c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center rounded-md border border-border p-0.5">
          <ModeBtn active={mode === "lista"} onClick={() => setMode("lista")} icon={<Rows3 className="h-3.5 w-3.5" />} label="Lista de títulos" />
          <ModeBtn active={mode === "quantidade"} onClick={() => setMode("quantidade")} icon={<Layers3 className="h-3.5 w-3.5" />} label="Quantidade" />
        </div>

        {mode === "lista" ? (
          <div className="space-y-1.5">
            <Label>Títulos (um por linha)</Label>
            <Textarea rows={6} value={titles} onChange={(e) => setTitles(e.target.value)} placeholder={"Reels 01\nReels 02\nCorte podcast"} />
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <Label>Prefixo</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Ex: Reels agosto" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as VideoStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as VideoPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["baixa", "media", "alta", "urgente"] as VideoPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prazo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
          <p className="text-muted-foreground">
            {parsed.length > 0
              ? `${parsed.length} vídeo(s): ${parsed.slice(0, 3).join(", ")}${parsed.length > 3 ? "…" : ""}`
              : "Nenhum vídeo definido ainda."}
          </p>
          {clientId && (
            <p className="mt-1.5 font-medium">
              {pricing && pricing.pricePerVideo > 0 ? (
                <>Valor gerado: <span className="text-[oklch(0.72_0.17_155)]">{formatBRL(estimated)}</span>{" "}
                  <span className="text-muted-foreground">({formatBRL(pricing.pricePerVideo)} por vídeo · {pricing.source})</span></>
              ) : (
                <span className="text-muted-foreground">Sem valor por vídeo definido para este cliente.</span>
              )}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving || parsed.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar {parsed.length || ""} vídeos
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs transition",
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
    )}>{icon}{label}</button>
  );
}
