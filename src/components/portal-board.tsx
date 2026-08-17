import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { naturalCompare } from "@/lib/format";
import { CalendarClock, GripVertical, Loader2 } from "lucide-react";
import { STAGE_ACCENT } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { isoDay, formatDue } from "@/components/due-date-popover";

type Col = "producao" | "aguardando" | "ajustes" | "aprovado";

const COLUMNS: { id: Col; label: string; hint: string; droppable: boolean }[] = [
  { id: "producao", label: "Em produção", hint: "Nosso time está editando", droppable: false },
  { id: "aguardando", label: "Aguardando você", hint: "Precisa da sua revisão", droppable: false },
  { id: "ajustes", label: "Pedir ajustes", hint: "Arraste aqui para solicitar mudanças", droppable: true },
  { id: "aprovado", label: "Aprovado", hint: "Arraste aqui para aprovar", droppable: true },
];

function colOf(s: VideoStatus): Col {
  if (s === "aprovado" || s === "entregue") return "aprovado";
  if (s === "alteracoes") return "ajustes";
  if (s === "aguardando_cliente" || s === "revisao") return "aguardando";
  return "producao";
}

const DUE_CHIPS: { label: string; day: string | null }[] = [
  { label: "Hoje", day: isoDay(0) },
  { label: "Amanhã", day: isoDay(1) },
  { label: "Em 3 dias", day: isoDay(3) },
  { label: "Em 1 semana", day: isoDay(7) },
  { label: "Sem prazo", day: null },
];

/**
 * Quadro estilo Trello no portal: o cliente arrasta cartões entre colunas
 * para aprovar/pedir ajustes e sobre as etiquetas de prazo para mudar datas.
 */
export function PortalBoard({
  token,
  videos,
  onChange,
  onOpen,
}: {
  token: string;
  videos: any[];
  onChange: () => void;
  onOpen?: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<{ id: string; title: string } | null>(null);
  const [comment, setComment] = useState("");

  function startDrag(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  async function approve(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("portal_approve_video", { _token: token, _video_id: id, _comment: "" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Vídeo aprovado. Obrigado!");
    onChange();
  }

  async function sendChanges() {
    if (!ask) return;
    if (!comment.trim()) return toast.error("Descreva o ajuste desejado");
    setBusy(true);
    const { error } = await supabase.rpc("portal_request_changes", {
      _token: token, _video_id: ask.id, _comment: comment,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado");
    setAsk(null); setComment("");
    onChange();
  }

  async function setDue(id: string, day: string | null) {
    setBusy(true);
    const { error } = await supabase.rpc("portal_set_due_date", {
      _token: token, _video_id: id, _due: day as any,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(day ? `Prazo para ${formatDue(day)}` : "Prazo removido");
    onChange();
  }

  function dropOnColumn(col: Col) {
    const id = dragId;
    setDragId(null); setOver(null);
    if (!id) return;
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    const from = colOf(v.status as VideoStatus);
    if (from === col) return;
    if (col === "aprovado") return void approve(id);
    if (col === "ajustes") { setAsk({ id, title: v.title }); return; }
    toast.info("Essa etapa é atualizada pelo time de edição.");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border p-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />Solte um cartão aqui para mudar o prazo:
        </span>
        {DUE_CHIPS.map((c) => (
          <button
            key={c.label}
            onDragOver={(e) => { e.preventDefault(); setOver(`due-${c.label}`); }}
            onDragLeave={() => setOver((o) => (o === `due-${c.label}` ? null : o))}
            onDrop={(e) => { e.preventDefault(); const id = dragId; setDragId(null); setOver(null); if (id) setDue(id, c.day); }}
            className={cn(
              "rounded-full border border-border px-2.5 py-1 text-[11px] transition",
              over === `due-${c.label}` ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = videos
            .filter((v) => colOf(v.status as VideoStatus) === col.id)
            .sort((a, b) => naturalCompare(a.title, b.title));
          const active = over === col.id && col.droppable;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); dropOnColumn(col.id); }}
              className={cn(
                "rounded-xl border p-2.5 transition",
                active ? "border-primary bg-primary/5" : "border-border bg-card/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider">{col.label}</p>
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <p className="mb-2 px-0.5 text-[10px] text-muted-foreground">{col.hint}</p>
              <div className="space-y-2">
                {items.map((v) => (
                  <div
                    key={v.id}
                    draggable
                    onDragStart={(e) => startDrag(e, v.id)}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    onClick={() => onOpen?.(v.id)}
                    className={cn(
                      "group cursor-grab rounded-lg border border-border bg-card p-2.5 text-left transition active:cursor-grabbing lift hover:lift-hover",
                      dragId === v.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{v.title}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_ACCENT[v.status as VideoStatus] }} />
                          <span className="text-[10px] text-muted-foreground">
                            {v.due_date ? formatDue(v.due_date) : "sem prazo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-2 py-4 text-center text-[10px] text-muted-foreground">
                    vazio
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!ask} onOpenChange={(o) => { if (!o) { setAsk(null); setComment(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar ajuste — {ask?.title}</DialogTitle></DialogHeader>
          <Label>Descreva o que precisa ser ajustado</Label>
          <Textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ex: cortar de 00:12 a 00:15, aumentar volume da trilha…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAsk(null); setComment(""); }}>Cancelar</Button>
            <Button onClick={sendChanges} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PortalBoardEmpty() {
  return <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum vídeo em andamento.</Card>;
}
