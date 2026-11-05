import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Check, Mic, Layers3, Users, CalendarClock, ChevronRight, ChevronDown, Film, Kanban, Timer,
  TrendingUp, TrendingDown, Bell, Wallet, FolderOpen, Clapperboard, Sparkle, UserPlus, BarChart3, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "AlvasharFlow — Organize clientes e entregas de vídeo" },
      { name: "description", content: "Para editores e agências de vídeo: clientes, levas, prazos e entregas do mês em um só quadro. Teste grátis por 30 dias." },
      { property: "og:title", content: "AlvasharFlow — Organize clientes e entregas de vídeo" },
      { property: "og:description", content: "Clientes, levas, prazos e entregas do mês em um só quadro. Teste grátis por 30 dias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PLANS = [
  { name: "Mensal", price: "R$ 69,90", note: "Sem fidelidade. Cancele quando quiser.", items: ["Acesso completo", "Clientes e editores ilimitados", "Copiloto por voz", "Portal do cliente"] },
  { name: "Anual · Mais vantajoso", price: "R$ 39,90", note: "Cobrado R$ 478,80 por ano · ~43% OFF.", items: ["Acesso completo", "Economia de 43%", "Copiloto por voz", "Portal do cliente", "Prioridade em novidades"], featured: true },
  { name: "Trimestral", price: "R$ 54,90", note: "Cobrado R$ 164,70 a cada 3 meses · ~21% OFF.", items: ["Acesso completo", "Economia de 21%", "Copiloto por voz", "Portal do cliente"] },
];

const NICHES = ["Reels", "VSL", "Podcast", "YouTube", "Shorts", "TikTok", "Anúncios", "Lançamentos", "Cortes", "Motion"];

function Landing() {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-landing text-foreground">
      <Nav />
      <main>
        <Hero />
        <Niches />
        <Bento />
        <Split
          eyebrow="Visão do mês"
          title="Veja o mês inteiro de cada cliente em segundos"
          text="Cada leva fica no mês certo. O que é de outubro não se mistura com novembro — e o que ficou pendente continua acessível."
          bullets={["Progresso real de entregas por cliente", "Prazos atrasados e de hoje separados", "Mês da leva independente do prazo"]}
          visual={<MonthVisual />}
        />
        <Split
          reverse
          eyebrow="Equipe"
          title="Distribua demandas entre editores sem planilha"
          text="Saiba quem está livre, quem está sobrecarregado e passe vídeos de um editor para outro com poucos cliques."
          bullets={["Carga semanal por editor", "Alertas de sobrecarga", "Cronômetro por vídeo"]}
          visual={<TeamVisual />}
        />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("font-display font-bold tracking-tight", small ? "text-sm" : "text-lg")}>ALVASHAR</span>
      <span className={cn("rounded-full bg-primary", small ? "h-1.5 w-1.5" : "h-2 w-2")} />
    </div>
  );
}

function PrimaryCta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      to="/auth"
      className={cn(
        "btn-cta inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold",
        "shadow-[inset_0_1px_0_oklch(1_0_0/0.4),0_8px_24px_-10px_var(--primary)] transition-transform hover:scale-[1.03]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 px-4">
      <div className="glass-apple mx-auto mt-3 flex max-w-5xl items-center justify-between rounded-full py-2 pr-2 pl-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
          <a href="#recursos" className="font-medium text-foreground">Recursos</a>
          <a href="#mes" className="transition-colors hover:text-foreground">Visão do mês</a>
          <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
          <Link to="/auth" className="transition-colors hover:text-foreground">Entrar</Link>
        </nav>
        <PrimaryCta className="px-4 py-2 text-[13px]">Testar grátis <ArrowRight className="h-3.5 w-3.5" /></PrimaryCta>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="relative z-20 mx-auto max-w-4xl px-6 pt-24 text-center md:pt-28">
        <a href="#recursos" className="animate-rise chip-ref inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs">
          <span className="rounded-full btn-cta px-2.5 py-0.5 font-semibold">Novo</span>
          <span className="text-foreground/90">Copiloto por voz</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </a>
        <h1 className="animate-rise mt-7 font-display text-5xl leading-[1.04] font-semibold tracking-[-0.03em] text-foreground [animation-delay:80ms] md:text-7xl">
          Sua produção de vídeos,
          <br />
          organizada de verdade.
        </h1>
        <p className="animate-rise mx-auto mt-6 max-w-lg text-base text-muted-foreground [animation-delay:160ms] md:text-lg">
          Clientes, levas do mês, prazos e editores em um só lugar. Feito para editores e agências de vídeo.
        </p>
        <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
          <a href="#recursos" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:text-foreground">
            Ver recursos <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <PrimaryCta className="px-6">Começar 30 dias grátis <ArrowRight className="h-3.5 w-3.5" /></PrimaryCta>
        </div>
      </div>

      {/* Eclipse: planeta escuro com aro de luz concentrado no zênite */}
      <div aria-hidden className="relative z-10 mx-auto mt-6 h-[300px] max-w-[1400px] overflow-hidden md:h-[380px]">
        <div className="absolute left-1/2 top-[90px] aspect-square w-[min(1000px,150vw)] -translate-x-1/2">
          <div className="eclipse-glow absolute inset-0" />
          <div className="eclipse-body absolute inset-0" />
          <div className="eclipse-rim absolute inset-0" />
          <div className="absolute inset-[9%] rounded-full border-t border-foreground/[0.08]" />
        </div>
        <div className="absolute left-1/2 top-[89px] h-[2px] w-80 -translate-x-1/2 bg-gradient-to-r from-transparent via-foreground to-transparent" />
        <div className="absolute left-1/2 top-[80px] h-5 w-[420px] -translate-x-1/2 rounded-[50%] bg-violet/30 blur-xl" />
      </div>

      {/* Painel do produto surgindo de trás do eclipse */}
      <div className="relative z-20 mx-auto -mt-[150px] max-w-5xl px-6 md:-mt-[170px]">
        <AppMockup />
      </div>
    </section>
  );
}

function Spark({ points = "0,18 12,14 24,16 36,9 48,12 60,6 72,10 84,4 100,7", className, down }: { points?: string; className?: string; down?: boolean }) {
  return (
    <svg viewBox="0 0 100 24" className={cn("h-6 w-full", down ? "text-destructive" : "text-primary", className)} fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id={down ? "spark-d" : "spark-u"} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,24 ${points} 100,24`} fill={`url(#${down ? "spark-d" : "spark-u"})`} />
      <polyline points={points} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AppMockup() {
  const stats = [
    { label: "Vídeos no mês", value: "128", up: "12%" },
    { label: "Concluídos", value: "94", up: "8%" },
    { label: "Atrasados", value: "3", up: "40%", down: true },
    { label: "Receita prevista", value: "R$ 9,6k", up: "15%" },
  ];
  const batches = [
    { name: "Roney", sub: "30 Reels · Novembro", done: 22, total: 30, tone: "from-primary to-primary-glow" },
    { name: "Pedro Henrique", sub: "12 Cortes · Novembro", done: 12, total: 12, tone: "from-success to-primary" },
    { name: "Bruna Studio", sub: "8 VSL · Novembro", done: 3, total: 8, tone: "from-warning to-destructive" },
  ];
  const weeks = [[62, 38], [30, 44], [48, 52], [28, 20], [74, 40], [32, 48], [66, 36]];
  const nav = [["Workflow", Kanban], ["Clientes", Users], ["Equipe", UserPlus], ["Financeiro", Wallet], ["Relatórios", BarChart3]] as const;
  return (
    <div className="rounded-[22px] border border-foreground/[0.08] bg-landing/90 p-1.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.1),0_60px_140px_-50px_oklch(0_0_0/0.95)] backdrop-blur-xl">
      <div className="rounded-2xl border border-foreground/[0.06] bg-landing text-left">
        <div className="flex items-center justify-between border-b border-foreground/[0.06] px-5 py-3.5">
          <Logo small />
          <div className="hidden items-center gap-5 text-[11px] text-muted-foreground md:flex">
            {nav.map(([n, I], i) => (
              <span key={n} className={cn("flex items-center gap-1.5", i === 0 && "font-medium text-foreground")}>
                <I className="h-3.5 w-3.5" /> {n}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary-deep" />
          </div>
        </div>
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold tracking-tight">Novembro</p>
            <span className="chip-ref inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/90"><Layers3 className="h-3 w-3" /> Nova leva</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card-ref rounded-xl px-3.5 py-3">
                <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>{s.label}</span>
                  <span className={cn("flex items-center gap-0.5 font-semibold normal-case tracking-normal", s.down ? "text-destructive" : "text-success")}>
                    {s.down ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}{s.up}
                  </span>
                </div>
                <div className="mt-1.5 flex items-end gap-3">
                  <p className="font-display text-lg font-semibold tabular-nums">{s.value}</p>
                  <Spark className="h-5 flex-1" down={s.down} points={s.down ? "0,6 15,9 30,7 45,13 60,11 75,17 100,19" : undefined} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="card-ref rounded-xl p-4">
              <p className="text-[12px] font-semibold">Levas do mês</p>
              <p className="text-[10px] text-muted-foreground">Progresso real por cliente</p>
              <div className="mt-3 space-y-1">
                {batches.map((b) => (
                  <div key={b.name} className="flex items-center gap-3 rounded-lg px-1 py-2">
                    <span className={cn("h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br", b.tone)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[11px]"><span className="font-medium">{b.name}</span><span className="tabular-nums text-muted-foreground">{b.done}/{b.total}</span></div>
                      <p className="text-[9.5px] text-muted-foreground">{b.sub}</p>
                      <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-foreground/[0.06]"><div className="h-full rounded-full bg-primary" style={{ width: `${(b.done / b.total) * 100}%` }} /></div>
                    </div>
                    <span className="hidden text-[10px] font-medium text-foreground/80 sm:inline">Abrir</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-ref rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold">Entregas por semana</p>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">Este mês <ChevronDown className="h-3 w-3" /></span>
              </div>
              <div className="relative mt-3 flex h-[118px] items-end justify-between gap-2 border-b border-foreground/[0.06] px-1">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-foreground/[0.05]" />
                {weeks.map(([a, b], i) => (
                  <div key={i} className="flex h-full flex-1 items-end justify-center gap-1">
                    <div className="w-2 rounded-t-[3px] bg-primary shadow-[0_0_12px_-2px_var(--primary)]" style={{ height: `${a}%` }} />
                    <div className="w-2 rounded-t-[3px] bg-primary/25" style={{ height: `${b}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between px-1 text-[9px] text-muted-foreground">
                {["S1", "S2", "S3", "S4", "S5", "S6", "S7"].map((w) => <span key={w} className="flex-1 text-center">{w}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Niches() {
  const row = [...NICHES, ...NICHES];
  return (
    <section className="py-20">
      <p className="text-center text-sm text-muted-foreground">Feito para quem entrega dezenas de vídeos por mês</p>
      <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        <div className="animate-marquee flex w-max gap-14">
          {row.map((n, i) => (
            <span key={i} className="flex items-center gap-2 font-display text-2xl font-semibold text-muted-foreground/60">
              <Film className="h-5 w-5" /> {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card-ref relative overflow-hidden rounded-[20px] p-6", className)}>{children}</div>;
}

function CardTitle({ title, text, center = true }: { title: string; text: string; center?: boolean }) {
  return (
    <div className={cn(center && "text-center")}>
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className={cn("mt-1.5 text-[13px] leading-relaxed text-muted-foreground", center && "mx-auto max-w-[240px]")}>{text}</p>
    </div>
  );
}

function Bento() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h2 className="font-display text-4xl font-semibold tracking-[-0.025em] md:text-5xl">Recursos que fazem diferença</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Tudo o que a sua operação precisa, sem excesso.</p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-[300px_300px]">
        {/* 1 — Levas: pílulas empilhadas, uma ativa */}
        <Card className="flex flex-col pr-0">
          <div className="pr-6"><CardTitle title="Levas por mês" text="Crie 30 vídeos de uma vez, já no mês certo." /></div>
          <div className="relative mt-auto space-y-2 pb-1">
            <div className="ml-4 flex items-center gap-2.5 rounded-l-xl btn-cta py-2.5 pr-4 pl-3 text-[11px] font-medium">
              <Layers3 className="h-3.5 w-3.5" /> <span className="font-semibold">RON-12</span>
              <span className="h-2.5 w-2.5 rounded-full border-2 border-primary-foreground/70" />
              <span className="truncate">Reels 12 · gancho novo</span>
            </div>
            <div className="chip-ref ml-4 flex items-center gap-2.5 rounded-l-xl py-2.5 pr-4 pl-3 text-[11px] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" /> <span className="font-semibold">RON-11</span>
              <span className="h-2.5 w-2.5 rounded-full border-2 border-warning" />
              <span className="truncate text-foreground/90">Corte podcast · revisão</span>
            </div>
            <div className="chip-ref ml-4 flex items-center gap-2.5 rounded-l-xl py-2.5 pr-4 pl-3 text-[11px] text-muted-foreground opacity-60">
              <Layers3 className="h-3.5 w-3.5" /> <span className="font-semibold">RON-10</span>
              <span className="h-2.5 w-2.5 rounded-full border-2 border-success" />
              <span className="truncate">Teaser lançamento</span>
            </div>
          </div>
        </Card>

        {/* 2 — Entregas: cartões empilhados com KPI */}
        <Card className="flex flex-col">
          <CardTitle title="Entregas do mês" text="Progresso real, cliente por cliente." />
          <div className="relative mt-auto">
            <div className="chip-ref absolute inset-x-6 -top-3 h-6 rounded-t-xl opacity-60" />
            <div className="chip-ref absolute inset-x-3 -top-1.5 h-6 rounded-t-xl opacity-80" />
            <div className="relative rounded-xl border border-foreground/[0.08] bg-landing px-4 py-3.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <span>Concluídos</span>
                <span className="flex items-center gap-1 normal-case tracking-normal text-success"><TrendingUp className="h-3 w-3" /> 8,4%</span>
              </div>
              <div className="mt-1 flex items-end gap-4">
                <p className="font-display text-2xl font-semibold tabular-nums">94<span className="text-muted-foreground">/128</span></p>
                <Spark className="h-7 flex-1" points="0,20 10,16 20,18 30,11 40,14 50,8 60,12 70,5 80,9 90,4 100,6" />
              </div>
            </div>
          </div>
        </Card>

        {/* 3 — Copiloto: feixe de luz descendo sobre a lente */}
        <Card className="flex flex-col items-center md:row-span-2">
          <div aria-hidden className="animate-beam absolute inset-x-0 top-0 h-[42%] blur-md [clip-path:polygon(10%_0,90%_0,60%_100%,40%_100%)] bg-gradient-to-b from-primary/70 to-primary/30" />
          <div aria-hidden className="animate-beam absolute inset-x-0 top-0 h-[42%] [clip-path:polygon(14%_0,86%_0,58%_100%,42%_100%)] bg-gradient-to-b from-primary via-primary/85 to-primary/40" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-[42%] [clip-path:polygon(14%_0,86%_0,58%_100%,42%_100%)] [background:repeating-conic-gradient(from_160deg_at_50%_100%,transparent_0deg_3deg,oklch(1_0_0/0.14)_3deg_4deg)]" />
          <div className="absolute left-1/2 top-[38%] flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-[26px] border border-foreground/10 bg-landing shadow-[inset_0_1px_0_oklch(1_0_0/0.2),inset_0_-12px_24px_-12px_color-mix(in_oklab,var(--primary)_40%,transparent),0_24px_50px_-14px_oklch(0_0_0/0.95)] transition-transform hover:scale-105">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-foreground/[0.14] to-transparent">
              <Mic className="h-7 w-7 text-foreground" />
            </div>
          </div>
          <div className="mt-auto w-full text-left">
            <h3 className="font-display text-lg font-semibold tracking-tight">Copiloto por voz</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">“5 vídeos do Roney até as 15h” — e a leva já está criada.</p>
          </div>
        </Card>

        {/* 4 — Organização: árvore cliente > marca > vídeos */}
        <Card className="grid gap-6 p-0 sm:grid-cols-2 md:col-span-2">
          <div className="self-end p-6 pt-8">
            <CardTitle center={false} title="Clientes, marcas e vídeos" text="Toda a estrutura da agência em uma árvore simples, do cliente até cada vídeo." />
          </div>
          <div className="relative overflow-hidden pt-5">
            <div className="h-full rounded-tl-2xl border-t border-l border-foreground/[0.08] bg-landing/80 p-5 text-[13px] shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
              <p className="flex items-center gap-2.5 font-medium"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground"><Users className="h-3 w-3" /></span> Roney <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /></p>
              <p className="mt-3 flex items-center gap-2.5 text-foreground/90"><FolderOpen className="h-3.5 w-3.5 text-muted-foreground" /> Marca Pessoal</p>
              <div className="mt-2 ml-[7px] space-y-2 border-l border-foreground/[0.1] pl-5 text-muted-foreground">
                <p className="flex items-center gap-2"><Clapperboard className="h-3.5 w-3.5" /> Reels · 30</p>
                <p className="flex items-center gap-2 text-foreground"><Clapperboard className="h-3.5 w-3.5 text-primary" /> Cortes · 12</p>
              </div>
              <p className="mt-3 flex items-center gap-2.5 text-foreground/90"><FolderOpen className="h-3.5 w-3.5 text-muted-foreground" /> Curso Online</p>
              <p className="mt-3 flex items-center gap-2.5 text-muted-foreground"><Kanban className="h-3.5 w-3.5" /> Projetos</p>
              <Sparkle aria-hidden className="animate-float absolute right-10 top-14 h-14 w-14 fill-foreground text-foreground" />
              <Sparkle aria-hidden className="absolute right-28 top-28 h-6 w-6 fill-foreground/80 text-foreground/80" />
              <span aria-hidden className="absolute right-24 top-10 h-2.5 w-2.5 rounded-full bg-foreground" />
              <span aria-hidden className="absolute right-6 bottom-12 h-6 w-6 rotate-45 rounded-[5px] bg-foreground/85" />
            </div>
          </div>
        </Card>
      </div>

      {/* faixa de etapas */}
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {[["Recebido", Kanban, "Material chegou"], ["Editando", Timer, "Com cronômetro"], ["Revisão", CalendarClock, "Rodadas contadas"], ["Concluído", Check, "Pronto para entregar"]].map(([label, Icon, hint], i) => {
          const I = Icon as typeof Kanban;
          return (
            <div key={label as string} className={cn("card-ref flex items-center gap-3 rounded-2xl px-4 py-3.5", i === 1 && "border-primary/40")}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", i === 1 ? "btn-cta" : "chip-ref text-muted-foreground")}>
                <I className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{label as string}</p>
                <p className="text-xs text-muted-foreground">{hint as string}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Split({ eyebrow, title, text, bullets, visual, reverse }: { eyebrow: string; title: string; text: string; bullets: string[]; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <section id={reverse ? undefined : "mes"} className="mx-auto max-w-6xl px-6 py-20">
      <div className={cn("grid items-center gap-12 md:grid-cols-2", reverse && "md:[&>*:first-child]:order-2")}>
        <div>{visual}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">{title}</h3>
          <p className="mt-4 text-muted-foreground">{text}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3"><CheckBox />{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CheckBox() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]">
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

function MonthVisual() {
  const rows = [
    { icon: Gauge, title: "Roney · 50/50", text: "Leva de novembro completa", active: true },
    { icon: Layers3, title: "Pedro Henrique · 22/30", text: "8 vídeos em edição" },
    { icon: CalendarClock, title: "Bruna · 8/12", text: "2 prazos vencem hoje" },
  ];
  return (
    <Card className="min-h-[360px] p-5">
      <div aria-hidden className="absolute -right-24 -bottom-28 aspect-square w-80">
        <div className="eclipse-glow absolute inset-0 [mask-image:none] opacity-70" />
        <div className="eclipse-body absolute inset-0" />
        <div className="absolute inset-0 rounded-full p-[2px] [background:conic-gradient(from_250deg,transparent_0deg,var(--primary)_40deg,oklch(0.98_0.02_210)_70deg,var(--primary)_100deg,transparent_160deg)] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]" />
        <div className="absolute inset-[18%] rounded-full border border-foreground/[0.06]" />
      </div>
      <div className="relative space-y-2.5">
        {rows.map((r) => (
          <div key={r.title} className={cn("flex items-center gap-4 rounded-2xl px-4 py-3.5", r.active ? "chip-ref" : "opacity-55")}>
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", r.active ? "btn-cta" : "chip-ref")}>
              <r.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TeamVisual() {
  const team = [["Lucas", 32], ["Marina", 41], ["João", 18]] as const;
  return (
    <Card className="p-7">
      <div className="flex items-center gap-3">
        <div className="chip-ref flex h-10 w-10 items-center justify-center rounded-xl"><Users className="h-5 w-5 text-primary" /></div>
        <div><p className="font-display text-sm font-semibold">Carga da semana</p><p className="text-xs text-muted-foreground">Capacidade de 40h por editor</p></div>
      </div>
      <div className="relative mt-6 flex h-40 items-end gap-6">
        <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-foreground/[0.12]" style={{ bottom: `${(40 / 45) * 100}%` }} />
        {team.map(([n, h]) => (
          <div key={n} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className={cn("w-full max-w-14 rounded-t-lg", h > 40 ? "bg-destructive/80" : "bg-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]")} style={{ height: `${(h / 45) * 100}%` }} />
            <span className="text-xs text-muted-foreground">{n} · {h}h</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Pricing() {
  return (
    <section id="planos" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <h2 className="font-display text-4xl font-semibold tracking-[-0.025em] md:text-5xl">Planos simples</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Acesso completo em todos. Comece com 30 dias grátis.</p>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-3 md:items-start">
        {PLANS.map((p) => (
          <div key={p.name} className={cn("rounded-[20px]", p.featured && "md:-mt-5")}>
            <div className={cn("card-ref rounded-[20px] p-7", p.featured && "border-primary/70 shadow-[inset_0_1px_0_oklch(1_0_0/0.1),0_30px_80px_-40px_var(--primary)]")}>
              <p className="font-display text-4xl font-semibold tracking-tight tabular-nums">{p.price}<span className="text-sm font-medium text-muted-foreground"> /mês</span></p>
              <p className="mt-2 font-semibold">{p.name}</p>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">{p.note}</p>
              <Link
                to="/auth"
                className={cn(
                  "mt-6 flex items-center justify-center rounded-full py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]",
                  p.featured ? "btn-cta" : "chip-ref text-foreground",
                )}
              >
                Começar grátis
              </Link>
            </div>
            <ul className="space-y-3 px-7 pt-6 pb-2 text-sm">
              {p.items.map((i) => (
                <li key={i} className="flex items-center gap-3 text-foreground/90"><CheckBox />{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="card-ref relative overflow-hidden rounded-[28px] p-10 md:p-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">Organize o próximo mês hoje.</h2>
            <p className="mt-3 text-muted-foreground">Cadastre seus clientes e crie a primeira leva em menos de 5 minutos.</p>
            <PrimaryCta className="mt-7 px-6 py-3">Começar 30 dias grátis <ArrowRight className="h-4 w-4" /></PrimaryCta>
            <p className="mt-3 text-xs text-muted-foreground">Sem cartão · cancele quando quiser</p>
          </div>
          <div className="hidden md:block"><MonthVisual /></div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">O sistema de organização para editores e agências de vídeo.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Produto</p>
          <a href="#recursos" className="block text-muted-foreground hover:text-foreground">Recursos</a>
          <a href="#planos" className="block text-muted-foreground hover:text-foreground">Planos</a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Conta</p>
          <Link to="/auth" className="block text-muted-foreground hover:text-foreground">Entrar</Link>
          <Link to="/auth" className="block text-muted-foreground hover:text-foreground">Criar conta</Link>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} AlvasharFlow</p>
    </footer>
  );
}
