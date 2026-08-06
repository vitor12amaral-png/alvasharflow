import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Kanban, Users, LineChart, Shield, Zap, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({ meta: [
    { title: "AlvasharFlow — Alta gestão para agências de edição" },
    { name: "description", content: "Painel completo para operar agências de edição em alto volume: clientes, workflow, entregas e portal do cliente." },
    { property: "og:title", content: "AlvasharFlow — Alta gestão para agências de edição" },
    { property: "og:description", content: "Painel completo para operar agências de edição em alto volume." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-lg font-semibold tracking-tight">AlvasharFlow</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <a href="#modulos" className="hidden text-muted-foreground hover:text-foreground md:inline">Módulos</a>
          <Link to="/auth" className="rounded-md border border-border bg-card/60 px-4 py-2 font-medium hover:bg-card">
            Entrar
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Feito para operações de alto volume
            </div>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] font-semibold tracking-tight md:text-6xl">
              Sua agência de edição<br />
              <span className="bg-gradient-to-r from-primary to-[oklch(0.66_0.22_300)] bg-clip-text text-transparent">
                rodando no ritmo certo.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              AlvasharFlow centraliza clientes, demandas, workflow e portal do cliente. Feito para
              quem entrega dezenas de vídeos por semana sem perder o controle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_40px_-8px_oklch(0.72_0.19_235_/_0.6)] transition hover:brightness-110"
              >
                Começar teste de 30 dias
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a href="#modulos" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-5 py-2.5 text-sm hover:bg-card">
                Ver módulos
              </a>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              30 dias grátis · sem cartão · cancele quando quiser.
            </p>
          </div>

          <div className="relative">
            <div className="glass-card rounded-2xl p-1">
              <MockDashboard />
            </div>
          </div>
        </section>

        <section id="modulos" className="mt-24">
          <h2 className="font-display text-2xl font-semibold">Tudo em um só painel</h2>
          <p className="mt-2 text-sm text-muted-foreground">Feito para quem opera múltiplos clientes ao mesmo tempo.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card rounded-xl p-5">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs tracking-widest text-muted-foreground uppercase">
        AlvasharFlow · Alta gestão para editores
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Users, title: "Clientes", desc: "CRM, briefing, pacotes e portal público por cliente." },
  { icon: Kanban, title: "Workflow", desc: "Kanban de 10 estágios com multi-seleção e agrupamento." },
  { icon: ExternalLink, title: "Portal do cliente", desc: "Link público para aprovação, revisão e NPS." },
  { icon: LineChart, title: "Dashboard", desc: "KPIs de entrega, pipeline e produtividade em tempo real." },
];


function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.22_260)] shadow-[0_0_30px_-6px_oklch(0.72_0.19_235_/_0.7)]">
      <span className="font-display text-sm font-bold text-primary-foreground">A</span>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="rounded-xl bg-background/60 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Dashboard</p>
          <p className="mt-1 font-display text-lg font-semibold">Julho · 132 vídeos</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Shield className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { l: "Em edição", v: "18" },
          { l: "Atrasados", v: "3", warn: true },
          { l: "Entregues", v: "94" },
        ].map((m) => (
          <div key={m.l} className="rounded-lg border border-border bg-card/60 p-3">
            <p className="text-[11px] text-muted-foreground">{m.l}</p>
            <p className={`mt-1 font-display text-xl font-semibold ${m.warn ? "text-[oklch(0.78_0.16_75)]" : ""}`}>{m.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {[
          { t: "Reels — Bruna", d: "Hoje", p: "high" },
          { t: "Corte podcast #14", d: "Sex", p: "medium" },
          { t: "Thumbnails outubro", d: "Seg", p: "low" },
        ].map((r) => (
          <div key={r.t} className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2">
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${r.p === "high" ? "bg-destructive" : r.p === "medium" ? "bg-[oklch(0.78_0.16_75)]" : "bg-primary"}`} />
              <span className="text-sm">{r.t}</span>
            </div>
            <span className="text-xs text-muted-foreground">{r.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
