import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Film, Package } from "lucide-react";
import { STAGE_ACCENT } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { cn } from "@/lib/utils";
import { MonthPicker, useMonthFromSearch } from "@/components/month-picker";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarioPage,
  validateSearch: (search: Record<string, unknown>) => ({ month: typeof search.month === "string" ? search.month : undefined }),
  head: () => ({ meta: [
    { title: "Calendário de produção — AlvasharFlow" },
    { name: "description", content: "Visualize prazos de vídeos e vencimentos de pacotes por mês." },
    { property: "og:title", content: "Calendário de produção — AlvasharFlow" },
    { property: "og:description", content: "Prazos e vencimentos da operação de vídeos em um calendário mensal." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function CalendarioPage() {
  const { year, month } = useMonthFromSearch();
  const [clientId, setClientId] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const [vids, packs] = await Promise.all([
        supabase.from("videos").select("id, title, due_date, status, competence_month, client_id, clients(name)"),
        supabase.from("client_packages").select("id, end_date, client_id, clients(name)").not("end_date", "is", null),
      ]);
      return { all: vids.data ?? [], packages: packs.data ?? [] };
    },
  });

  const clientOptions = Array.from(new Map((data?.all ?? []).filter((v) => v.client_id).map((v) => [v.client_id!, v.clients?.name ?? "Cliente"])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const scoped = (data?.all ?? []).filter((v) => clientId === "all" || v.client_id === clientId);
  const dated = scoped.filter((v) => v.due_date);
  const undatedAll = scoped.filter((v) => !v.due_date);
  const packages = (data?.packages ?? []).filter((p) => clientId === "all" || p.client_id === clientId);

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });

  const eventsByDay: Record<string, { type: "video" | "package"; label: string; sub: string; accent?: string }[]> = {};
  dated.forEach((v) => {
    const key = v.due_date!.slice(0, 10);
    (eventsByDay[key] ??= []).push({
      type: "video", label: v.title, sub: v.clients?.name ?? "",
      accent: STAGE_ACCENT[v.status as VideoStatus],
    });
  });
  packages.forEach((p) => {
    const key = p.end_date!.slice(0, 10);
    (eventsByDay[key] ??= []).push({ type: "package", label: `Fim do pacote — ${p.clients?.name ?? ""}`, sub: "" });
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Calendário"
        subtitle="Prazos e vencimentos de pacote"
        actions={
          <div className="flex items-center gap-2">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9 w-48" aria-label="Filtrar por cliente"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <MonthPicker />
          </div>
        }
      />

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card className="mt-6 overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="p-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((c, i) => {
              const key = c.date?.toISOString().slice(0, 10) ?? "";
              const evts = eventsByDay[key] ?? [];
              const isToday = c.date && c.date.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={cn(
                  "min-h-[92px] border-r border-b border-border p-1.5",
                  !c.date && "bg-muted/20",
                )}>
                  {c.date && (
                    <>
                      <div className={cn("text-[11px] font-medium", isToday && "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
                        {c.date.getDate()}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {evts.slice(0, 3).map((e, idx) => (
                          <div key={idx} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[9px]"
                            style={{ backgroundColor: (e.accent ?? "oklch(0.78 0.16 75)") + "22", color: e.accent ?? "oklch(0.78 0.16 75)" }}>
                            {e.type === "video" ? <Film className="h-2.5 w-2.5 shrink-0" /> : <Package className="h-2.5 w-2.5 shrink-0" />}
                            <span className="truncate">{e.label}</span>
                          </div>
                        ))}
                        {evts.length > 3 && <p className="text-[9px] text-muted-foreground">+{evts.length - 3}</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(() => {
        const key = `${year}-${String(month + 1).padStart(2, "0")}`;
        const undated = undatedAll.filter((v) => (v.competence_month ?? "").slice(0, 7) === key && v.status !== "entregue");
        if (undated.length === 0) return null;
        return (
          <Card className="mt-4 p-4">
            <p className="font-display text-sm font-semibold">Sem prazo definido neste mês ({undated.length})</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {undated.map((v) => (
                <span key={v.id} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[v.status as VideoStatus] }} />
                  {v.title}<span className="text-muted-foreground">· {v.clients?.name ?? ""}</span>
                </span>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
