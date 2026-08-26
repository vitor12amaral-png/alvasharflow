import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, CalendarClock, AlertCircle, DollarSign } from "lucide-react";
import { formatBRL, formatDate, daysUntil } from "@/lib/format";
import { PACKAGE_LABEL } from "@/lib/video-workflow";
import type { PackageSize } from "@/lib/video-workflow";
import { suggestPerVideo } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro — AlvasharFlow" }] }),
});

function FinanceiroPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const [packages, videos, clients] = await Promise.all([
        supabase.from("client_packages").select("*, clients(name)").order("end_date", { ascending: true }),
        supabase.from("videos").select("id, client_id, created_at"),
        supabase.from("clients").select("id, parent_client_id, price_per_video"),
      ]);
      if (packages.error) throw packages.error;
      if (videos.error) throw videos.error;
      if (clients.error) throw clients.error;
      return { packages: packages.data ?? [], videos: videos.data ?? [], clients: clients.data ?? [] };
    },
  });

  if (isLoading || !data) return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const packages = data.packages;

  const active = packages.filter((p) => p.status === "ativo");
  const total = active.reduce((s, p) => s + Number(p.price ?? 0), 0);
  const month = new Date().toISOString().slice(0, 7);
  const activeByClient = new Map(active.map((p) => [p.client_id, suggestPerVideo(p.price_per_video, p.price, p.total_videos)]));
  const generated = data.videos.filter((v) => v.created_at.slice(0, 7) === month).reduce((sum, video) => {
    const client = data.clients.find((item) => item.id === video.client_id);
    return sum + (activeByClient.get(video.client_id) ?? (client?.parent_client_id ? activeByClient.get(client.parent_client_id) : undefined) ?? Number(client?.price_per_video ?? 0));
  }, 0);
  const upcoming = active.filter((p) => {
    const d = daysUntil(p.end_date);
    return d !== null && d <= 30;
  });
  const overdue = active.filter((p) => {
    const d = daysUntil(p.end_date);
    return d !== null && d < 0;
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Financeiro" subtitle="Pacotes e receitas" />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(generated)}</p>
          <p className="text-xs text-muted-foreground">Gerado pelos vídeos neste mês</p>
        </Card>
        <Card className="p-4">
          <DollarSign className="h-4 w-4 text-[oklch(0.72_0.17_155)]" />
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(total)}</p>
          <p className="text-xs text-muted-foreground">Receita mensal (pacotes ativos)</p>
        </Card>
        <Card className="p-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="mt-2 font-display text-2xl font-bold">{active.length}</p>
          <p className="text-xs text-muted-foreground">Pacotes ativos</p>
        </Card>
        <Card className={`p-4 ${overdue.length > 0 ? "border-destructive/40" : ""}`}>
          <AlertCircle className={`h-4 w-4 ${overdue.length > 0 ? "text-destructive" : "text-[oklch(0.78_0.16_75)]"}`} />
          <p className="mt-2 font-display text-2xl font-bold">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Renovações nos próximos 30 dias</p>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {upcoming.length > 0 && (
          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 font-display text-sm font-semibold"><CalendarClock className="h-4 w-4" />Renovações próximas</p>
            <div className="space-y-2">
              {upcoming.map((p) => {
                const d = daysUntil(p.end_date);
                return (
                  <PackageRow key={p.id} p={p} highlight={(d ?? 999) <= 7} />
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <p className="mb-3 font-display text-sm font-semibold">Todos os pacotes ({packages.length})</p>
          <div className="divide-y divide-border">
            {packages.map((p) => <PackageRow key={p.id} p={p} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PackageRow({ p, highlight }: { p: { id: string; client_id: string; size: string; total_videos: number; videos_used: number; price: number | string; start_date: string; end_date: string | null; payment_day: number | null; status: string; clients?: { name: string } | null }; highlight?: boolean }) {
  const d = daysUntil(p.end_date);
  return (
    <div className={`flex flex-wrap items-center gap-3 py-3 ${highlight ? "-mx-2 rounded-md bg-destructive/5 px-2" : ""}`}>
      <div className="min-w-0 flex-1">
        <Link to="/clientes/$clientId" params={{ clientId: p.client_id }} className="text-sm font-medium hover:underline">
          {p.clients?.name ?? "—"}
        </Link>
        <p className="text-[11px] text-muted-foreground">
          {PACKAGE_LABEL[p.size as PackageSize]} · {p.videos_used}/{p.total_videos} usados · dia {p.payment_day ?? "—"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
        {p.end_date && p.status === "ativo" && (
          <p className={`text-[11px] font-medium ${highlight ? "text-destructive" : "text-muted-foreground"}`}>
            {(d ?? 0) < 0 ? `${Math.abs(d ?? 0)}d atrás` : `em ${d}d`}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="font-display text-base font-semibold">{formatBRL(p.price)}</p>
        <Badge variant={p.status === "ativo" ? "default" : "outline"} className="text-[9px]">{p.status}</Badge>
      </div>
    </div>
  );
}
