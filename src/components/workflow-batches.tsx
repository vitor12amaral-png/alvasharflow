import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupVideoBatches, type BatchVideo } from "@/lib/video-batches";

export function WorkflowBatches<T extends BatchVideo>({ allVideos, visibleVideos, month, renderVideos }: {
  allVideos: T[]; visibleVideos: T[]; month: string; renderVideos: (rows: T[]) => ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const visibleIds = new Set(visibleVideos.map(v => v.id));
  const groups = groupVideoBatches(allVideos, month);
  const byClient = new Map<string, typeof groups>();
  for (const group of groups) {
    if (!group.rows.some(v => visibleIds.has(v.id))) continue;
    const clientId = group.rows[0]?.client_id;
    if (!clientId) continue;
    byClient.set(clientId, [...(byClient.get(clientId) ?? []), group]);
  }
  if (!byClient.size) return <p className="py-12 text-center text-sm text-muted-foreground">Nenhum vídeo neste mês com os filtros atuais.</p>;
  return <div className="space-y-8">{Array.from(byClient.entries()).map(([clientId, batches]) => (
    <section key={clientId} className="min-w-0 space-y-2">
      <h2 className="text-base font-semibold text-foreground">{batches[0]?.clientName}</h2>
      {batches.map(batch => {
        const open = !collapsed.has(batch.key);
        const rows = batch.rows.filter(v => visibleIds.has(v.id));
        const panelId = `batch-${batch.key}`;
        return <div key={batch.key} className="min-w-0 border-b border-border/60 pb-3">
          <Button variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal px-2 py-3 text-left" aria-expanded={open} aria-controls={panelId}
            onClick={() => setCollapsed(prev => { const next = new Set(prev); if (next.has(batch.key)) next.delete(batch.key); else next.add(batch.key); return next; })}>
            {open ? <ChevronDown /> : <ChevronRight />}
            <Layers3 className="text-primary" />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block break-words font-semibold text-foreground">{batch.label}</span>
              <span className="block text-xs font-normal text-muted-foreground">{batch.delivered} de {batch.rows.length} entregues{batch.approved > 0 ? ` · ${batch.approved} aprovado${batch.approved > 1 ? "s" : ""} para entrega` : ""}{rows.length !== batch.rows.length ? ` · ${rows.length} visíveis` : ""}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-foreground">{Math.round(batch.delivered / batch.rows.length * 100)}%</span>
          </Button>
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Entregas de ${batch.label}`} aria-valuenow={batch.delivered} aria-valuemin={0} aria-valuemax={batch.rows.length}>
            <div className="h-full origin-left bg-success transition-transform duration-200 motion-reduce:transition-none" style={{ transform: `scaleX(${batch.delivered / batch.rows.length})` }} />
          </div>
          {open && <div id={panelId} className="min-w-0 overflow-x-auto">{renderVideos(rows)}</div>}
        </div>;
      })}
    </section>
  ))}</div>;
}