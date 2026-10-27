import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, CalendarClock, AlertCircle, DollarSign, CheckCircle2, Hourglass } from "lucide-react";
import { formatBRL, formatDate, daysUntil } from "@/lib/format";
import { PACKAGE_LABEL } from "@/lib/video-workflow";
import type { PackageSize } from "@/lib/video-workflow";
import { MonthPicker, useMonthFromSearch } from "@/components/month-picker";
import { monthFinance, packageUsage, type FinClient, type FinPackage, type FinVideo } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/financeiro")({
  validateSearch: (search: Record<string, unknown>) => ({ month: typeof search.month === "string" ? search.month : undefined }),
  component: FinanceiroPage,
  head: () => ({
    meta: [
      { title: "Financeiro — AlvasharFlow" },
      { name: "description", content: "Receita prevista, entregue e uso dos pacotes de cada cliente." },
      { property: "og:title", content: "Financeiro — AlvasharFlow" },
      { property: "og:description", content: "Receita prevista, entregue e uso dos pacotes de cada cliente." },
    ],
  }),
});

type PkgRow = FinPackage & { size: string; videos_used: number; payment_day: number | null; clients?: { name: string } | null };

function FinanceiroPage() {
  const { ym, year, month } = useMonthFromSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const [packages, videos, clients] = await Promise.all([
        supabase.from("client_packages").select("*, clients(name)").order("end_date", { ascending: true }),
        supabase.from("videos").select("id, client_id, package_id, competence_month, created_at, status, unit_price"),
        supabase.from("clients").select("id, parent_client_id, price_per_video"),
      ]);
      if (packages.error) throw packages.error;
      if (videos.error) throw videos.error;
      if (clients.error) throw clients.error;
      return {
        packages: (packages.data ?? []) as PkgRow[],
        videos: (videos.data ?? []) as FinVideo[],
        clients: (clients.data ?? []) as FinClient[],
      };
    },
  });

  if (isLoading || !data) return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const { packages, videos, clients } = data;
  const active = packages.filter((p) => p.status === "ativo");
  const recurring = active.reduce((s, p) => s + Number(p.price ?? 0), 0);
  const fin = monthFinance(videos, ym, packages, clients);
  const upcoming = active.filter((p) => { const d = daysUntil(p.end_date); return d !== null && d <= 30; });
  const overdue = upcoming.filter((p) => (daysUntil(p.end_date) ?? 0) < 0);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long" });
  const deliveredPct = fin.forecast > 0 ? Math.round((fin.deliveredValue / fin.forecast) * 100) : 0;

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Financeiro" subtitle="Quanto os vídeos do mês valem e como cada pacote está sendo usado" actions={<MonthPicker />} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(fin.forecast)}</p>
          <p className="text-xs text-muted-foreground">Previsto em {monthLabel} · {fin.total} vídeos</p>
        </Card>
        <Card className="p-4">
          <CheckCircle2 className="h-4 w-4 text-[oklch(0.72_0.17_155)]" />
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(fin.deliveredValue)}</p>
          <p className="text-xs text-muted-foreground">Já entregue · {fin.delivered} vídeos ({deliveredPct}%)</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[oklch(0.72_0.17_155)] transition-all" style={{ width: `${deliveredPct}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <Hourglass className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(fin.pendingValue)}</p>
          <p className="text-xs text-muted-foreground">Falta entregar · {fin.total - fin.delivered} vídeos</p>
        </Card>
        <Card className="p-4">
          <DollarSign className="h-4 w-4 text-primary" />
          <p className="mt-2 font-display text-2xl font-bold">{formatBRL(recurring)}</p>
          <p className="text-xs text-muted-foreground">Receita dos {active.length} pacotes ativos</p>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {upcoming.length > 0 && (
          <Card className={`p-5 ${overdue.length > 0 ? "border-destructive/40" : ""}`}>
            <p className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
              {overdue.length > 0 ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CalendarClock className="h-4 w-4" />}
              Renovações nos próximos 30 dias ({upcoming.length})
            </p>
            <div className="divide-y divide-border">
              {upcoming.map((p) => (
                <PackageRow key={p.id} p={p} usage={packageUsage(p, videos, clients)} highlight={(daysUntil(p.end_date) ?? 999) <= 7} />
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <p className="mb-3 font-display text-sm font-semibold">Todos os pacotes ({packages.length})</p>
          {packages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pacote cadastrado. Crie um no perfil do cliente.</p>
          ) : (
            <div className="divide-y divide-border">
              {packages.map((p) => <PackageRow key={p.id} p={p} usage={packageUsage(p, videos, clients)} />)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PackageRow({ p, usage, highlight }: { p: PkgRow; usage: ReturnType<typeof packageUsage>; highlight?: boolean }) {
  const d = daysUntil(p.end_date);
  return (
    <div className={`flex flex-wrap items-center gap-3 py-3 ${highlight ? "-mx-2 rounded-md bg-destructive/5 px-2" : ""}`}>
      <div className="min-w-[200px] flex-1">
        <Link to="/clientes/$clientId" params={{ clientId: p.client_id }} className="text-sm font-medium hover:underline">
          {p.clients?.name ?? "—"}
        </Link>
        <p className="text-[11px] text-muted-foreground">
          {PACKAGE_LABEL[p.size as PackageSize] ?? p.size} · {usage.allocated} vídeos criados · pagamento dia {p.payment_day ?? "—"}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usage.percent}%` }} />
          </div>
          <span className="text-[11px] font-medium">{usage.delivered}/{p.total_videos} entregues</span>
          {usage.exceeded > 0 ? (
            <Badge variant="destructive" className="text-[9px]">+{usage.exceeded} além do pacote</Badge>
          ) : p.status === "ativo" && usage.remaining > 0 ? (
            <span className="text-[11px] text-muted-foreground">faltam {usage.remaining}</span>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
        {p.end_date && p.status === "ativo" && (
          <p className={`text-[11px] font-medium ${highlight ? "text-destructive" : "text-muted-foreground"}`}>
            {(d ?? 0) < 0 ? `venceu há ${Math.abs(d ?? 0)}d` : `vence em ${d}d`}
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
