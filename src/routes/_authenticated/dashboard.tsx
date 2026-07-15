import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatBRL, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Kanban, Users, Wallet, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    // client role goes to portal
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/portal" });
  },
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Nexo" }] }),
});

function Dashboard() {
  const { data: user } = useCurrentUser();
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [demandsRes, clientsRes, invoicesRes] = await Promise.all([
        supabase.from("demands").select("id, status, due_date, title, priority, created_at, clients(name)").order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("amount_cents, status, paid_at"),
      ]);
      const demands = demandsRes.data ?? [];
      const invoices = invoicesRes.data ?? [];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartISO = monthStart.toISOString();

      const active = demands.filter((d) => d.status !== "done").length;
      const overdue = demands.filter((d) => d.status !== "done" && d.due_date && d.due_date < today).length;
      const doneThisMonth = demands.filter((d) => d.status === "done").length;

      const receivedMonth = invoices
        .filter((i) => i.status === "paid" && i.paid_at && i.paid_at >= monthStartISO)
        .reduce((s, i) => s + i.amount_cents, 0);
      const pending = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount_cents, 0);

      const byStatus = [
        { name: "Backlog", value: demands.filter((d) => d.status === "backlog").length, fill: "oklch(0.68 0.02 260)" },
        { name: "Em andamento", value: demands.filter((d) => d.status === "in_progress").length, fill: "oklch(0.72 0.19 235)" },
        { name: "Revisão", value: demands.filter((d) => d.status === "review").length, fill: "oklch(0.78 0.16 75)" },
        { name: "Entregue", value: demands.filter((d) => d.status === "done").length, fill: "oklch(0.72 0.17 155)" },
      ];

      const upcoming = demands
        .filter((d) => d.status !== "done" && d.due_date)
        .slice(0, 6);

      return {
        clientsCount: clientsRes.count ?? 0,
        active,
        overdue,
        doneThisMonth,
        receivedMonth,
        pending,
        byStatus,
        upcoming,
      };
    },
  });

  if (stats.isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const s = stats.data!;

  return (
    <div className="p-6 md:p-8">
      <PageHeader title={`Olá, ${user?.fullName?.split(" ")[0] ?? "bem-vindo"}`} subtitle="Sua operação em um relance." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Kanban} label="Demandas ativas" value={s.active.toString()} />
        <KpiCard icon={AlertTriangle} label="Atrasadas" value={s.overdue.toString()} tone={s.overdue > 0 ? "warn" : undefined} />
        <KpiCard icon={Wallet} label="Recebido no mês" value={formatBRL(s.receivedMonth)} tone="ok" />
        <KpiCard icon={TrendingUp} label="A receber" value={formatBRL(s.pending)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Demandas por status</h3>
              <p className="text-xs text-muted-foreground">Distribuição atual do pipeline</p>
            </div>
            <Link to="/demandas" className="text-xs text-primary hover:underline">Ver kanban →</Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.byStatus}>
                <XAxis dataKey="name" stroke="oklch(0.68 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ background: "oklch(0.20 0.022 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {s.byStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Próximos prazos</h3>
              <p className="text-xs text-muted-foreground">Ordenado por vencimento</p>
            </div>
          </div>
          <div className="space-y-2">
            {s.upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nada agendado.</p>}
            {s.upcoming.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{(d as any).clients?.name ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${d.priority === "high" ? "bg-destructive" : d.priority === "medium" ? "bg-[oklch(0.78_0.16_75)]" : "bg-primary"}`} />
                  <span className="text-xs text-muted-foreground">{formatDate(d.due_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <QuickLink to="/clientes" icon={Users} label="Gerenciar clientes" hint={`${s.clientsCount} cadastrados`} />
        <QuickLink to="/demandas" icon={Kanban} label="Abrir kanban" hint={`${s.active} em andamento`} />
        <QuickLink to="/financeiro" icon={Wallet} label="Cobranças" hint={formatBRL(s.pending) + " a receber"} />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`mt-3 font-display text-3xl font-semibold ${tone === "warn" ? "text-[oklch(0.78_0.16_75)]" : tone === "ok" ? "text-[oklch(0.72_0.17_155)]" : ""}`}>{value}</p>
    </Card>
  );
}

function QuickLink({ to, icon: Icon, label, hint }: { to: any; icon: any; label: string; hint: string }) {
  return (
    <Link to={to} className="glass-card group flex items-center justify-between rounded-xl p-4 transition hover:border-primary/40">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
