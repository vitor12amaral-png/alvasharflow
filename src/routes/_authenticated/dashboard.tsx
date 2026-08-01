import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Users, Film, Clock, CheckCircle2, AlertTriangle, PlayCircle, Send, ThumbsUp, Loader2, TrendingUp, CalendarClock } from "lucide-react";
import { formatBRL, formatDate, relativeTime, daysUntil } from "@/lib/format";
import { STAGE_LABEL, STAGE_ACCENT, VIDEO_STAGES } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { describeActivity } from "./clientes_.$clientId";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — alves.edt" }] }),
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [clients, videos, packages, activity] = await Promise.all([
        supabase.from("clients").select("id, name, status, parent_client_id, videos(id, status)"),
        supabase.from("videos").select("id, title, status, due_date, priority, client_id, created_at, clients(name)"),
        supabase.from("client_packages").select("id, client_id, size, total_videos, videos_used, end_date, status, clients(name)").eq("status", "ativo"),
        supabase.from("activity_log").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(20),
      ]);
      return {
        clients: clients.data ?? [],
        videos: videos.data ?? [],
        packages: packages.data ?? [],
        activity: activity.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Conta apenas clientes-mãe/independentes para não inflar com sub-marcas.
  const activeClients = data.clients.filter((c) => c.status === "ativo" && !c.parent_client_id).length;
  const byStatus = (s: VideoStatus) => data.videos.filter((v) => v.status === s).length;
  const pendentes = byStatus("recebido") + byStatus("briefing") + byStatus("organizacao") + byStatus("fila");
  const editando = byStatus("editando") + byStatus("revisao") + byStatus("alteracoes");
  const aguardando = byStatus("aguardando_cliente");
  const aprovados = byStatus("aprovado");
  const entregues = byStatus("entregue");
  const totalMes = data.videos.filter((v) => new Date(v.created_at) >= monthStart).length;

  const atrasados = data.videos.filter((v) => {
    if (!v.due_date || v.status === "entregue" || v.status === "aprovado") return false;
    return new Date(v.due_date) < now;
  });

  // Top clients with most pending
  const clientPending: Record<string, { name: string; count: number }> = {};
  for (const v of data.videos) {
    if (v.status === "entregue" || v.status === "aprovado") continue;
    const name = v.clients?.name ?? "—";
    if (!clientPending[v.client_id]) clientPending[v.client_id] = { name, count: 0 };
    clientPending[v.client_id].count++;
  }
  const topClients = Object.entries(clientPending).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count).slice(0, 5);

  const upcomingPackages = data.packages
    .filter((p) => p.end_date)
    .map((p) => ({ ...p, days: daysUntil(p.end_date) }))
    .filter((p) => p.days !== null && p.days <= 30)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    .slice(0, 5);

  const chartData = VIDEO_STAGES.map((s) => ({ name: s.label, value: byStatus(s.id), color: s.accent }));

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Dashboard" subtitle="Visão geral da operação" />

      {/* KPI row */}
      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KPI icon={Users} label="Clientes ativos" value={activeClients} tint="oklch(0.72 0.19 235)" />
        <KPI icon={Clock} label="Pendentes" value={pendentes} tint="oklch(0.72 0.16 200)" />
        <KPI icon={PlayCircle} label="Em edição" value={editando} tint="oklch(0.72 0.19 235)" />
        <KPI icon={Send} label="Aguardando cliente" value={aguardando} tint="oklch(0.78 0.16 75)" />
        <KPI icon={ThumbsUp} label="Aprovados" value={aprovados} tint="oklch(0.72 0.17 155)" />
        <KPI icon={CheckCircle2} label="Entregues" value={entregues} tint="oklch(0.60 0.14 155)" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPI icon={Film} label="Vídeos do mês" value={totalMes} tint="oklch(0.66 0.22 300)" />
        <KPI icon={AlertTriangle} label="Atrasadas" value={atrasados.length} tint="oklch(0.62 0.22 25)" alert={atrasados.length > 0} />
        <KPI icon={TrendingUp} label="Em produção" value={pendentes + editando} tint="oklch(0.72 0.19 235)" />
        <KPI icon={CalendarClock} label="Renovações próx." value={upcomingPackages.length} tint="oklch(0.78 0.16 75)" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Vídeos por estágio</p>
            <Link to="/workflow" className="text-xs text-primary hover:underline">Abrir workflow →</Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 260)" }} interval={0} angle={-25} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                  contentStyle={{ background: "oklch(0.20 0.022 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top pending clients */}
        <Card className="p-5">
          <p className="font-display text-sm font-semibold">Clientes com mais pendentes</p>
          <div className="mt-3 space-y-2">
            {topClients.length === 0 && <p className="text-xs text-muted-foreground">Nenhum vídeo em produção.</p>}
            {topClients.map((c) => (
              <Link key={c.id} to="/clientes/$clientId" params={{ clientId: c.id }}
                className="flex items-center gap-3 rounded-md p-2 transition hover:bg-muted/40">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="flex-1 truncate text-sm">{c.name}</p>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{c.count}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Upcoming packages */}
        <Card className="p-5">
          <p className="font-display text-sm font-semibold">Próximos vencimentos de pacote</p>
          <div className="mt-3 space-y-2">
            {upcomingPackages.length === 0 && <p className="text-xs text-muted-foreground">Nenhum vencimento nos próximos 30 dias.</p>}
            {upcomingPackages.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md p-2 transition hover:bg-muted/40">
                <CalendarClock className={`h-4 w-4 ${(p.days ?? 999) <= 7 ? "text-destructive" : "text-[oklch(0.78_0.16_75)]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{p.clients?.name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">Vence em {formatDate(p.end_date)}</p>
                </div>
                <span className={`text-xs font-semibold ${(p.days ?? 999) <= 7 ? "text-destructive" : ""}`}>
                  {p.days === 0 ? "Hoje" : (p.days ?? 0) < 0 ? `${Math.abs(p.days ?? 0)}d atrás` : `${p.days}d`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-5">
          <p className="font-display text-sm font-semibold">Últimas movimentações</p>
          <ol className="relative mt-3 space-y-2.5 border-l border-border pl-4">
            {data.activity.length === 0 && <p className="text-xs text-muted-foreground">Sem atividade ainda.</p>}
            {data.activity.map((a) => (
              <li key={a.id} className="relative">
                <div
                  className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: STAGE_ACCENT[((a.metadata as Record<string, unknown>).to as VideoStatus) ?? "recebido"] ?? "oklch(0.72 0.19 235)" }}
                />
                <p className="text-[13px]">{describeActivity(a.entity_type, a.action, a.metadata as Record<string, unknown>)}</p>
                <p className="text-[10px] text-muted-foreground">{a.profiles?.full_name ?? "sistema"} · {relativeTime(a.created_at)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {atrasados.length > 0 && (
        <Card className="mt-4 border-destructive/30 p-5">
          <p className="flex items-center gap-2 font-display text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {atrasados.length} vídeo{atrasados.length > 1 ? "s" : ""} em atraso
          </p>
          <div className="mt-3 space-y-1.5">
            {atrasados.slice(0, 6).map((v) => (
              <div key={v.id} className="flex items-center gap-3 text-xs">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[v.status as VideoStatus] }} />
                <span className="flex-1 truncate">{v.title}</span>
                <span className="text-muted-foreground">{v.clients?.name}</span>
                <span className="text-destructive font-medium">{formatDate(v.due_date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, tint, alert }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: number; tint: string; alert?: boolean }) {
  return (
    <Card className={`relative overflow-hidden p-4 ${alert ? "border-destructive/40" : ""}`}>
      <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: tint }} />
      <Icon className="h-4 w-4" style={{ color: tint }} />
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}
