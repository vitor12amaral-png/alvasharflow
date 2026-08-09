import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import { useEditorMetrics } from "@/hooks/use-metrics";
import { fmtEstimate } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90];

/** Painel comparativo de performance por editor. */
export function EditorMetricsPanel() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useEditorMetrics(days);
  const rows = data ?? [];
  const maxDone = Math.max(1, ...rows.map((r) => r.done));

  return (
    <Card className="mt-6 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <p className="font-display text-sm font-semibold">Performance por editor</p>
        <div className="ml-auto flex gap-1">
          {RANGES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Sem dados no período.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 text-left font-medium">Editor</th>
                <th className="pb-2 text-left font-medium">Concluídos</th>
                <th className="pb-2 text-right font-medium">Em aberto</th>
                <th className="pb-2 text-right font-medium">Atrasados</th>
                <th className="pb-2 text-right font-medium">Tempo médio</th>
                <th className="pb-2 text-right font-medium">Vídeos/semana</th>
                <th className="pb-2 text-right font-medium">Tempo total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.done / maxDone) * 100}%` }} />
                      </div>
                      <span className="tabular-nums text-xs">{r.done}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums text-xs">{r.open}</td>
                  <td className={cn("py-2 text-right tabular-nums text-xs", r.late > 0 && "text-destructive")}>{r.late}</td>
                  <td className="py-2 text-right tabular-nums text-xs">{r.avgSecondsPerVideo ? fmtEstimate(r.avgSecondsPerVideo) : "—"}</td>
                  <td className="py-2 text-right tabular-nums text-xs">{r.throughputPerWeek}</td>
                  <td className="py-2 text-right tabular-nums text-xs text-muted-foreground">
                    {r.trackedSeconds ? fmtEstimate(r.trackedSeconds) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
