import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MonthPicker, useMonthFromSearch } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Layers3, AlertTriangle, ArrowUpRight, CalendarClock, Sparkles } from "lucide-react";
import { formatBRL, formatDate, relativeTime, daysUntil, initials } from "@/lib/format";
import { monthFinance, type FinClient, type FinPackage, type FinVideo } from "@/lib/finance";
import { DEFAULT_WEEKLY_CAPACITY_HOURS, DEFAULT_VIDEO_HOURS } from "@/lib/editor-load";
import { STAGE_LABEL } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { describeActivity } from "./clientes_.$clientId";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({ month: typeof search.month === "string" ? search.month : undefined }),
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — AlvasharFlow" },
      { name: "description", content: "Resultados do mês da agência: entregas, receita, levas e carga da equipe." },
      { property: "og:title", content: "Dashboard — AlvasharFlow" },
      { property: "og:description", content: "Resultados do mês da agência: entregas, receita, levas e carga da equipe." },
    ],
  }),
});

const DONE = new Set(["aprovado", "entregue"]);
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type V = FinVideo & {
  title: string; due_date: string | null; editor_id: string | null; estimated_hours: number | null;
  revision_count: number; updated_at: string; batch_id: string | null; clients?: { name: string } | null;
};

function prevYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function delta(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function DashboardPage() {
  const { ym, year, month } = useMonthFromSearch();
  const { data: me } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", me?.workspaceId],
    enabled: !!me,
    queryFn: async () => {
      const [videos, clients, packages, activity, members, profiles] = await Promise.all([
        supabase.from("videos").select("id, title, client_id, package_id, competence_month, created_at, updated_at, status, unit_price, due_date, editor_id, estimated_hours, revision_count, batch_id, clients(name)"),
        supabase.from("clients").select("id, name, parent_client_id, price_per_video"),
        supabase.from("client_packages").select("*, clients(name)"),
        supabase.from("activity_log").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(8),
        me?.workspaceId ? supabase.from("workspace_members").select("user_id, weekly_capacity_hours").eq("workspace_id", me.workspaceId) : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (videos.error) throw videos.error;
      return {
        videos: (videos.data ?? []) as unknown as V[],
        clients: (clients.data ?? []) as (FinClient & { name: string })[],
        packages: (packages.data ?? []) as (FinPackage & { clients?: { name: string } | null })[],
        activity: activity.data ?? [],
        members: (members.data ?? []) as { user_id: string; weekly_capacity_hours: number }[],
        profiles: (profiles.data ?? []) as { id: string; full_name: string | null }[],
      };
    },
  });

  if (isLoading || !data) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const { videos, clients, packages } = data;
  const pym = prevYm(ym);
  const inMonth = (v: V, k: string) => v.competence_month.slice(0, 7) === k;
  const cur = videos.filter((v) => inMonth(v, ym));
  const prev = videos.filter((v) => inMonth(v, pym));
  const done = cur.filter((v) => DONE.has(v.status));
  const donePrev = prev.filter((v) => DONE.has(v.status));
  const today = new Date().toISOString().slice(0, 10);
  const late = videos.filter((v) => v.due_date && v.due_date.slice(0, 10) < today && !DONE.has(v.status));
  const fin = monthFinance(videos, ym, packages, clients);
  const finPrev = monthFinance(videos, pym, packages, clients);
  const firstPass = done.length ? Math.round((done.filter((v) => (v.revision_count ?? 0) === 0).length / done.length) * 100) : 0;
  const firstPassPrev = donePrev.length ? Math.round((donePrev.filter((v) => (v.revision_count ?? 0) === 0).length / donePrev.length) * 100) : 0;

  // Sparkline: acumulado diário de conclusões no mês (pelo dia da última atualização)
  const daysIn = new Date(year, month + 1, 0).getDate();
  const dailyDone = Array.from({ length: daysIn }, () => 0);
  for (const v of done) { const d = new Date(v.updated_at); if (d.getFullYear() === year && d.getMonth() === month) dailyDone[d.getDate() - 1]++; }
  const cumulative = dailyDone.reduce<number[]>((a, n) => [...a, (a.at(-1) ?? 0) + n], []);
  const dailyCreated = Array.from({ length: daysIn }, () => 0);
  for (const v of cur) { const d = new Date(v.created_at); if (d.getFullYear() === year && d.getMonth() === month) dailyCreated[d.getDate() - 1]++; }

  const stats = [
    { label: "Vídeos no mês", value: String(cur.length), d: delta(cur.length, prev.length), series: dailyCreated.reduce<number[]>((a, n) => [...a, (a.at(-1) ?? 0) + n], []) },
    { label: "Concluídos", value: String(done.length), d: delta(done.length, donePrev.length), series: cumulative },
    { label: "Receita prevista", value: formatBRL(fin.forecast), d: delta(fin.forecast, finPrev.forecast), series: cumulative.map((n) => n) },
    { label: "Aprovação 1ª versão", value: `${firstPass}%`, d: firstPass - firstPassPrev, series: cumulative },
  ];

  // Levas do mês por cliente
  const byClient = new Map<string, { id: string; name: string; done: number; total: number; late: number }>();
  for (const v of cur) {
    const r = byClient.get(v.client_id) ?? { id: v.client_id, name: v.clients?.name ?? "—", done: 0, total: 0, late: 0 };
    r.total++; if (DONE.has(v.status)) r.done++;
    if (v.due_date && v.due_date.slice(0, 10) < today && !DONE.has(v.status)) r.late++;
    byClient.set(v.client_id, r);
  }
  const batches = [...byClient.values()].sort((a, b) => b.total - a.total).slice(0, 6);

  // Entregas por semana (concluídos vs planejados com prazo na semana)
  const weeks = Array.from({ length: Math.ceil(daysIn / 7) }, (_, i) => ({ label: `S${i + 1}`, done: 0, planned: 0 }));
  done.forEach((v) => { const d = new Date(v.updated_at); if (d.getMonth() === month && d.getFullYear() === year) weeks[Math.min(weeks.length - 1, Math.floor((d.getDate() - 1) / 7))].done++; });
  cur.forEach((v) => { if (!v.due_date) return; const d = new Date(v.due_date + "T12:00:00"); if (d.getMonth() === month && d.getFullYear() === year) weeks[Math.min(weeks.length - 1, Math.floor((d.getDate() - 1) / 7))].planned++; });
  const weekMax = Math.max(1, ...weeks.flatMap((w) => [w.done, w.planned]));

  // Carga da equipe
  const name = (id: string) => data.profiles.find((p) => p.id === id)?.full_name ?? "Editor";
  const load = data.members.map((m) => {
    const active = videos.filter((v) => v.editor_id === m.user_id && !DONE.has(v.status));
    const hours = active.reduce((s, v) => s + Number(v.estimated_hours ?? DEFAULT_VIDEO_HOURS), 0);
    const cap = Number(m.weekly_capacity_hours ?? DEFAULT_WEEKLY_CAPACITY_HOURS) || DEFAULT_WEEKLY_CAPACITY_HOURS;
    return { id: m.user_id, name: name(m.user_id), hours, cap, active: active.length, pct: Math.min(100, Math.round((hours / cap) * 100)) };
  }).sort((a, b) => b.pct - a.pct);

  // Pipeline por etapa (mês)
  const stageCount = new Map<string, number>();
  cur.forEach((v) => stageCount.set(v.status, (stageCount.get(v.status) ?? 0) + 1));
  const pipeline = [...stageCount.entries()].sort((a, b) => b[1] - a[1]);

  const renewals = packages.filter((p) => p.status === "ativo" && p.end_date)
    .map((p) => ({ ...p, days: daysUntil(p.end_date) }))
    .filter((p) => p.days !== null && p.days <= 30).sort((a, b) => (a.days ?? 0) - (b.days ?? 0)).slice(0, 4);

  const progress = cur.length ? Math.round((done.length / cur.length) * 100) : 0;

  return (
    <div className="p-5 md:p-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4 animate-rise">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-violet shadow-[0_0_10px_var(--violet)]" /> Dashboard
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">{MONTHS[month]} <span className="text-muted-foreground">{year}</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">{progress}% das demandas do mês concluídas · {late.length} em atraso</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker />
          <Button asChild><Link to="/workflow" search={{ new: "1" } as never}><Layers3 /> Nova leva</Link></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="card-ref rounded-2xl p-4 animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span>{s.label}</span>
              <span className={cn("flex items-center gap-0.5 font-semibold normal-case tracking-normal", s.d < 0 ? "text-destructive" : "text-success")}>
                {s.d < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}{Math.abs(s.d)}%
              </span>
            </div>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-display text-2xl font-semibold tabular-nums tracking-tight">{s.value}</p>
              <Spark series={s.series} down={s.d < 0} />
            </div>
          </div>
        ))}
      </div>

      {/* Levas + Entregas */}
      <div className="mt-3 grid gap-3 lg:grid-cols-5">
        <div className="card-ref rounded-2xl p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Levas do mês</p>
              <p className="text-xs text-muted-foreground">Progresso real por cliente</p>
            </div>
            <Link to="/workflow" search={{ month: ym } as never} className="text-xs text-muted-foreground hover:text-foreground">Ver todas</Link>
          </div>
          <div className="mt-4 space-y-1">
            {batches.length === 0 && <Empty text="Nenhuma demanda neste mês ainda." />}
            {batches.map((b, i) => {
              const pct = b.total ? (b.done / b.total) * 100 : 0;
              return (
                <Link key={b.id} to="/workflow" search={{ client: b.id, month: ym } as never}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-foreground/[0.03]">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold",
                    i % 3 === 0 ? "btn-cta" : i % 3 === 1 ? "bg-primary/15 text-primary" : "chip-ref text-foreground")}>{initials(b.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="truncate font-medium">{b.name}</span>
                      <span className="tabular-nums text-muted-foreground">{b.done}/{b.total}</span>
                    </div>
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet to-primary" style={{ width: `${pct}%` }} />
                    </div>
                    {b.late > 0 && <p className="mt-1 text-[10px] text-destructive">{b.late} em atraso</p>}
                  </div>
                  <span className="hidden items-center gap-0.5 text-[11px] text-muted-foreground group-hover:text-foreground sm:flex">Abrir <ArrowUpRight className="h-3 w-3" /></span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card-ref rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Entregas por semana</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet" /> Concluídos</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/30" /> Com prazo</span>
            </div>
          </div>
          <div className="relative mt-5 flex h-44 items-end justify-between gap-3 border-b border-foreground/[0.06] px-1">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-foreground/[0.05]" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-foreground/[0.05]" />
            {weeks.map((w) => (
              <div key={w.label} className="flex h-full flex-1 items-end justify-center gap-1" title={`${w.done} concluídos · ${w.planned} com prazo`}>
                <div className="w-2.5 rounded-t-[4px] bg-violet shadow-[0_0_14px_-2px_var(--violet)]" style={{ height: `${Math.max(2, (w.done / weekMax) * 100)}%` }} />
                <div className="w-2.5 rounded-t-[4px] bg-primary/30" style={{ height: `${Math.max(2, (w.planned / weekMax) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground">
            {weeks.map((w) => <span key={w.label} className="flex-1 text-center">{w.label}</span>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="chip-ref rounded-xl px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Já entregue</p>
              <p className="font-display text-base font-semibold tabular-nums">{formatBRL(fin.deliveredValue)}</p>
            </div>
            <div className="chip-ref rounded-xl px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">A receber</p>
              <p className="font-display text-base font-semibold tabular-nums">{formatBRL(fin.pendingValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Equipe, Etapas, Atenção */}
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="card-ref rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Carga da equipe</p>
            <Link to="/equipe" className="text-xs text-muted-foreground hover:text-foreground">Equipe</Link>
          </div>
          <div className="mt-4 space-y-3">
            {load.length === 0 && <Empty text="Convide editores para ver a carga." />}
            {load.slice(0, 5).map((e) => (
              <div key={e.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full chip-ref text-[9px] font-semibold">{initials(e.name)}</span>{e.name}</span>
                  <span className={cn("tabular-nums", e.pct >= 100 ? "text-destructive" : "text-muted-foreground")}>{e.hours}h / {e.cap}h</span>
                </div>
                <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div className={cn("h-full rounded-full", e.pct >= 100 ? "bg-destructive" : e.pct >= 80 ? "bg-warning" : "bg-primary")} style={{ width: `${e.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-ref rounded-2xl p-5">
          <p className="text-sm font-semibold">Etapas do mês</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pipeline.length === 0 && <Empty text="Sem vídeos no mês." />}
            {pipeline.map(([s, n]) => (
              <span key={s} className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px]", DONE.has(s) ? "bg-violet/15 text-foreground ring-1 ring-violet/40" : "chip-ref")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", DONE.has(s) ? "bg-violet" : "bg-primary")} />
                {STAGE_LABEL[s as VideoStatus] ?? s}
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </span>
            ))}
          </div>
          <div className="mt-5 border-t border-foreground/[0.06] pt-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><CalendarClock className="h-3 w-3" /> Renovações em 30 dias</p>
            <div className="mt-2 space-y-1.5">
              {renewals.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma renovação próxima.</p>}
              {renewals.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-[12px]">
                  <span className="truncate">{p.clients?.name ?? "—"}</span>
                  <span className={cn("tabular-nums", (p.days ?? 99) <= 7 ? "text-destructive" : "text-muted-foreground")}>{formatDate(p.end_date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-ref rounded-2xl p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {late.length > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4 text-violet-glow" />}
            {late.length > 0 ? `${late.length} em atraso` : "Movimentações recentes"}
          </p>
          <div className="mt-4 space-y-2">
            {late.length > 0
              ? late.slice(0, 6).map((v) => (
                <Link key={v.id} to="/workflow" search={{ client: v.client_id, video: v.id, month: v.competence_month.slice(0, 7) } as never}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition hover:bg-foreground/[0.03]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  <span className="flex-1 truncate">{v.title}</span>
                  <span className="text-muted-foreground">{formatDate(v.due_date)}</span>
                </Link>
              ))
              : data.activity.map((a) => (
                <div key={a.id} className="text-[12px]">
                  <p className="truncate">{describeActivity(a.entity_type, a.action, a.metadata as Record<string, unknown>)}</p>
                  <p className="text-[10px] text-muted-foreground">{a.profiles?.full_name ?? "sistema"} · {relativeTime(a.created_at)}</p>
                </div>
              ))}
            {late.length === 0 && data.activity.length === 0 && <Empty text="Sem atividade ainda." />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

function Spark({ series, down }: { series: number[]; down?: boolean }) {
  const max = Math.max(1, ...series);
  const n = Math.max(1, series.length - 1);
  const pts = series.length > 1 ? series.map((v, i) => `${(i / n) * 100},${22 - (v / max) * 18}`).join(" ") : "0,18 100,18";
  const id = down ? "dsp-d" : "dsp-u";
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={cn("h-7 flex-1", down ? "text-destructive" : "text-violet-glow")} fill="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,24 ${pts} 100,24`} fill={`url(#${id})`} />
      <polyline points={pts} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
