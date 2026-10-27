import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Mic, Layers3, Users, CalendarClock, Sparkles, TrendingUp, ChevronRight, Film, Kanban, Timer } from "lucide-react";
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
  { name: "Trimestral", price: "R$ 59,90", note: "Cobrado R$ 179,70 a cada 3 meses.", items: ["Acesso completo", "Economia de 14%", "Copiloto por voz", "Portal do cliente", "Prioridade em novidades"], featured: true },
  { name: "Anual", price: "R$ 44,90", note: "Cobrado R$ 538,80 por ano.", items: ["Acesso completo", "Economia de 36%", "Copiloto por voz", "Portal do cliente"] },
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

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-lg font-bold tracking-tight">ALVASHAR</span>
      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-landing/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
          <a href="#mes" className="transition-colors hover:text-foreground">Visão do mês</a>
          <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
          <Link to="/auth" className="transition-colors hover:text-foreground">Entrar</Link>
        </nav>
        <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)] transition-transform hover:scale-[1.03]">
          Testar grátis <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative">
      {/* light ray */}
      <div aria-hidden className="pointer-events-none absolute -top-20 left-[8%] h-[520px] w-40 -rotate-[28deg] bg-gradient-to-b from-foreground/10 to-transparent blur-2xl" />
      <div className="relative mx-auto max-w-4xl px-6 pt-24 text-center md:pt-32">
        <a href="#recursos" className="animate-rise inline-flex items-center gap-2 rounded-full border border-border/70 bg-landing-panel/80 py-1 pr-3 pl-1 text-xs backdrop-blur">
          <span className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">Novo</span>
          <span>Copiloto por voz</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </a>
        <h1 className="animate-rise mt-7 font-display text-5xl leading-[1.05] font-semibold tracking-tight [animation-delay:80ms] md:text-7xl">
          Sua produção de vídeos,
          <br />
          <span className="text-arctic">organizada de verdade.</span>
        </h1>
        <p className="animate-rise mx-auto mt-6 max-w-lg text-base text-muted-foreground [animation-delay:160ms] md:text-lg">
          Clientes, levas do mês, prazos e editores em um só lugar. Feito para editores e agências de vídeo.
        </p>
        <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
          <a href="#recursos" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground">
            Ver recursos <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_36px_-6px_var(--primary)] transition-transform hover:scale-[1.03]">
            Começar 30 dias grátis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* planet horizon */}
      <div className="relative mx-auto mt-16 h-[220px] max-w-5xl overflow-hidden md:h-[300px]">
        <div aria-hidden className="absolute left-1/2 top-0 aspect-square w-[min(820px,120vw)] -translate-x-1/2 rounded-full p-[2px] [background:var(--gradient-rim)] shadow-[0_-30px_120px_-20px_var(--primary-glow)]">
          <div className="h-full w-full rounded-full bg-landing" />
        </div>
        <div aria-hidden className="absolute left-1/2 top-2 h-40 w-[60%] -translate-x-1/2 rounded-[50%] bg-primary/20 blur-3xl" />
      </div>

      {/* product mockup */}
      <div className="relative z-10 mx-auto -mt-24 max-w-5xl px-6 md:-mt-36">
        <AppMockup />
      </div>
    </section>
  );
}

function AppMockup() {
  const cols = [
    { name: "Recebido", items: ["Reels 01", "Reels 02", "Corte podcast"] },
    { name: "Editando", items: ["Reels 03", "VSL nova"] },
    { name: "Revisão", items: ["Reels 04"] },
    { name: "Concluído", items: ["Reels 05", "Reels 06", "Teaser"] },
  ];
  const stats = [
    { label: "Vídeos no mês", value: "128", up: "+12%" },
    { label: "Concluídos", value: "94", up: "+8%" },
    { label: "Atrasados", value: "3", up: "-40%" },
    { label: "Receita prevista", value: "R$ 9.6k", up: "+15%" },
  ];
  return (
    <div className="rounded-2xl border border-border/70 bg-landing-panel/90 p-2 shadow-[0_50px_140px_-40px_oklch(0_0_0/0.9)] backdrop-blur-xl">
      <div className="rounded-xl border border-border/60 bg-landing/80 p-5 text-left">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <Logo />
          <div className="hidden gap-5 text-xs text-muted-foreground sm:flex">
            <span className="text-foreground">Workflow</span><span>Clientes</span><span>Equipe</span><span>Financeiro</span>
          </div>
          <div className="h-7 w-7 rounded-full bg-arctic" />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-display text-lg font-semibold">Roney · Novembro</p>
          <span className="rounded-full border border-border/70 px-3 py-1 text-[11px] text-muted-foreground">+ Nova leva</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 bg-landing-panel/70 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <div className="mt-1 flex items-end justify-between">
                <p className="font-display text-xl font-semibold">{s.value}</p>
                <span className="text-[10px] font-semibold text-success">{s.up}</span>
              </div>
              <Spark />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {cols.map((c, ci) => (
            <div key={c.name} className="rounded-lg border border-border/60 bg-landing-panel/50 p-2.5">
              <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{c.name} · {c.items.length}</p>
              <div className="space-y-1.5">
                {c.items.map((i, ii) => (
                  <div key={i} className={cn("rounded-md border px-2.5 py-2 text-xs font-medium", ci === 1 && ii === 0 ? "border-primary/60 bg-primary/15 text-foreground shadow-[0_0_18px_-6px_var(--primary)]" : "border-border/60 bg-landing")}>{i}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spark() {
  return (
    <svg viewBox="0 0 100 24" className="mt-2 h-5 w-full text-primary" fill="none">
      <path d="M0 18 L12 14 L24 16 L36 9 L48 12 L60 6 L72 10 L84 4 L100 7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
            <span key={i} className="flex items-center gap-2 font-display text-2xl font-semibold text-muted-foreground/70">
              <Film className="h-5 w-5" /> {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("relative overflow-hidden rounded-2xl border border-border/60 bg-landing-panel/70 p-6", className)}>{children}</div>;
}

function Bento() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Recursos que fazem diferença</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Tudo o que a sua operação precisa, sem excesso.</p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="text-center font-display text-lg font-semibold">Levas por mês</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">Crie 30 vídeos de uma vez, já no mês certo.</p>
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]"><Layers3 className="h-3.5 w-3.5" /> Roney · 30 Reels · Novembro</div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-landing px-3 py-2 text-xs"><Layers3 className="h-3.5 w-3.5 text-muted-foreground" /> Bruna · 12 cortes · Novembro</div>
          </div>
        </Card>
        <Card>
          <h3 className="text-center font-display text-lg font-semibold">Entregas do mês</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">Progresso real, cliente por cliente.</p>
          <div className="mt-6 rounded-lg border border-border/60 bg-landing p-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>Concluídos</span><span className="flex items-center gap-1 text-success"><TrendingUp className="h-3 w-3" /> 8%</span></div>
            <p className="font-display text-2xl font-semibold">94 / 128</p>
            <Spark />
          </div>
        </Card>
        <Card className="md:row-span-2 flex flex-col items-center">
          <div aria-hidden className="absolute left-1/2 top-0 h-44 w-48 -translate-x-1/2 [background:var(--gradient-beam)] [clip-path:polygon(0_0,100%_0,62%_100%,38%_100%)]" />
          <div className="relative mt-36 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-landing shadow-[0_0_40px_-6px_var(--primary)]">
            <Mic className="h-7 w-7 text-primary" />
          </div>
          <div className="mt-auto pt-10 text-center">
            <h3 className="font-display text-lg font-semibold">Copiloto por voz</h3>
            <p className="mt-1 text-sm text-muted-foreground">“5 vídeos do Roney até as 15h” — e a leva já está criada.</p>
          </div>
        </Card>
        <Card className="md:col-span-2 grid gap-6 sm:grid-cols-2">
          <div className="self-center">
            <h3 className="font-display text-lg font-semibold">Quadro de etapas</h3>
            <p className="mt-1 text-sm text-muted-foreground">Do material recebido à entrega, com o próximo passo sempre claro.</p>
          </div>
          <div className="relative space-y-1.5 text-sm">
            {[["Recebido", Kanban], ["Editando", Timer], ["Revisão", CalendarClock], ["Concluído", Check]].map(([label, Icon], i) => {
              const I = Icon as typeof Kanban;
              return (
                <div key={label as string} className={cn("flex items-center gap-2.5 rounded-md px-3 py-1.5", i === 1 ? "bg-primary/15 text-foreground" : "text-muted-foreground")}>
                  <I className={cn("h-4 w-4", i === 1 && "text-primary")} /> {label as string}
                </div>
              );
            })}
            <Sparkles className="absolute right-2 top-2 h-8 w-8 text-primary/70" />
          </div>
        </Card>
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
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h3>
          <p className="mt-4 text-muted-foreground">{text}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MonthVisual() {
  const clients = [["Roney", 50, 50], ["Pedro Henrique", 22, 30], ["Bruna", 8, 12], ["Dany", 4, 10]] as const;
  return (
    <Card className="p-7">
      <div aria-hidden className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full border-2 border-primary/40 shadow-[0_0_80px_-10px_var(--primary-glow)]" />
      <p className="relative font-display text-sm font-semibold">Novembro · entregas</p>
      <div className="relative mt-5 space-y-4">
        {clients.map(([n, d, t]) => (
          <div key={n}>
            <div className="flex justify-between text-xs"><span>{n}</span><span className="text-muted-foreground">{d}/{t}</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-arctic" style={{ width: `${(d / t) * 100}%` }} /></div>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]"><Users className="h-5 w-5" /></div>
        <div><p className="font-display text-sm font-semibold">Carga da semana</p><p className="text-xs text-muted-foreground">Capacidade de 40h por editor</p></div>
      </div>
      <div className="mt-6 flex h-40 items-end gap-6">
        {team.map(([n, h]) => (
          <div key={n} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className={cn("w-full rounded-t-lg", h > 40 ? "bg-destructive/80" : "bg-arctic shadow-[0_0_24px_-6px_var(--primary)]")} style={{ height: `${(h / 45) * 100}%` }} />
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
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Planos simples</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Acesso completo em todos. Comece com 30 dias grátis.</p>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-3 md:items-start">
        {PLANS.map((p) => (
          <div key={p.name} className={cn("rounded-2xl border bg-landing-panel/70 p-7", p.featured ? "border-primary/60 shadow-[0_30px_80px_-40px_var(--primary)] md:-mt-4" : "border-border/60")}>
            <p className="font-display text-4xl font-semibold">{p.price}<span className="text-sm font-medium text-muted-foreground"> /mês</span></p>
            <p className="mt-2 font-semibold">{p.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
            <Link to="/auth" className={cn("mt-6 flex items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]", p.featured ? "bg-primary text-primary-foreground shadow-[0_0_30px_-6px_var(--primary)]" : "border border-border/70 bg-landing text-foreground")}>
              Começar grátis
            </Link>
            <ul className="mt-7 space-y-3 text-sm">
              {p.items.map((i) => (
                <li key={i} className="flex items-center gap-3"><span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>{i}</li>
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
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-landing-panel/70 p-10 md:p-14">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-arctic shadow-[0_0_60px_10px_var(--primary-glow)]" />
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Organize o próximo mês hoje.</h2>
            <p className="mt-3 text-muted-foreground">Cadastre seus clientes e crie a primeira leva em menos de 5 minutos.</p>
            <Link to="/auth" className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_36px_-6px_var(--primary)] transition-transform hover:scale-[1.03]">
              Começar 30 dias grátis <ArrowRight className="h-4 w-4" />
            </Link>
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
    <footer className="border-t border-border/50">
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
