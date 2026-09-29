import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

  const { data, isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const [vids, packs] = await Promise.all([
        supabase.from("videos").select("id, title, due_date, status, clients(name)").not("due_date", "is", null),
        supabase.from("client_packages").select("id, end_date, clients(name)").not("end_date", "is", null),
      ]);
      return { videos: vids.data ?? [], packages: packs.data ?? [] };
    },
  });

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });

  const eventsByDay: Record<string, { type: "video" | "package"; label: string; sub: string; accent?: string }[]> = {};
  data?.videos.forEach((v) => {
    const key = v.due_date!.slice(0, 10);
    (eventsByDay[key] ??= []).push({
      type: "video", label: v.title, sub: v.clients?.name ?? "",
      accent: STAGE_ACCENT[v.status as VideoStatus],
    });
  });
  data?.packages.forEach((p) => {
    const key = p.end_date!.slice(0, 10);
    (eventsByDay[key] ??= []).push({ type: "package", label: `Fim do pacote — ${p.clients?.name ?? ""}`, sub: "" });
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Calendário"
        subtitle="Prazos e vencimentos de pacote"
        actions={
          <MonthPicker />
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
    </div>
  );
}
