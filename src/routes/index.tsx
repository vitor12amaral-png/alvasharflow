import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Kanban, Layers3, Timer, Users, Sparkles, CalendarClock } from "lucide-react";
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

const FEATURES = [
  { icon: Layers3, title: "Levas por mês", text: "Crie 30 vídeos em segundos e veja cada cliente no mês certo." },
  { icon: Kanban, title: "Quadro de etapas", text: "Do material recebido à entrega, com o próximo passo sempre claro." },
  { icon: CalendarClock, title: "Prazos sem susto", text: "Atrasados, para hoje e sem prazo separados com um clique." },
  { icon: Users, title: "Equipe e carga", text: "Veja as horas de cada editor e evite dias sobrecarregados." },
  { icon: Timer, title: "Tempo real", text: "Cronômetro por vídeo para saber quanto cada entrega custa." },
  { icon: Sparkles, title: "Copiloto por voz", text: "“5 vídeos do Roney até 15h” — e a leva já está criada." },
];

const PLANS = [
  { name: "Mensal", price: "R$ 69,90", desc: "Sem fidelidade. Cancele quando quiser.", items: ["Acesso completo", "Clientes e editores ilimitados", "Copiloto por voz", "Portal do cliente"] },
  { name: "Trimestral", price: "R$ 59,90", desc: "Cobrado R$ 179,70 a cada 3 meses.", items: ["Acesso completo", "Economia de 14%", "Copiloto por voz", "Portal do cliente"], featured: true },
  { name: "Anual", price: "R$ 44,90", desc: "Cobrado R$ 538,80 por ano.", items: ["Acesso completo", "Economia de 36%", "Copiloto por voz", "Portal do cliente"] },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-arctic font-display text-sm font-bold text-primary-foreground">A</div>
            <span className="font-display text-base font-semibold tracking-tight">AlvasharFlow</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#recursos" className="hidden text-muted-foreground transition-colors hover:text-foreground md:inline">Recursos</a>
            <a href="#planos" className="hidden text-muted-foreground transition-colors hover:text-foreground md:inline">Planos</a>
            <Link to="/auth" className="text-muted-foreground transition-colors hover:text-foreground">Entrar</Link>
            <Link to="/auth" className="rounded-full bg-arctic px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--primary-glow)] transition-transform hover:scale-[1.03]">
              Testar grátis
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pr-3 pl-1 text-xs backdrop-blur">
            <span className="rounded-full bg-arctic px-2 py-0.5 font-semibold text-primary-foreground">Novo</span>
            <span className="text-foreground">Copiloto por voz e levas mensais</span>
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-[1.04] font-bold tracking-tight md:text-7xl">
            <span className="text-arctic">Cada vídeo no lugar.</span>
            <br />
            <span className="text-arctic">Cada entrega no prazo.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            O sistema para editores e agências de vídeo organizarem clientes, levas do mês e entregas — sem planilha.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-arctic px-6 py-3 font-semibold text-primary-foreground shadow-[0_12px_40px_-12px_var(--primary-glow)] transition-transform hover:scale-[1.03]">
              Começar 30 dias grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#planos" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3 font-medium backdrop-blur transition-colors hover:bg-card">
              Ver planos
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Sem cartão · cancele quando quiser</p>

          <div className="relative mx-auto mt-20 max-w-4xl">
            <div aria-hidden className="absolute inset-x-10 -top-24 h-48 rounded-[50%] border-t-2 border-primary/60 bg-gradient-to-b from-primary/25 to-transparent blur-[2px]" />
            <div aria-hidden className="absolute inset-x-0 -top-10 h-40 bg-primary-glow/25 blur-3xl" />
            <BoardPreview />
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight md:text-4xl">Tudo que a sua operação precisa</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">Feito por quem entrega dezenas de vídeos por mês.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card/50 p-6 backdrop-blur transition-colors hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><f.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight md:text-4xl">Planos simples</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">Todos começam com 30 dias grátis.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-3 md:items-start">
            {PLANS.map((p) => (
              <div key={p.name} className={cn("rounded-2xl border bg-card/50 p-7 backdrop-blur", p.featured ? "border-primary/60 shadow-[0_20px_60px_-30px_var(--primary-glow)] md:-mt-3" : "border-border")}>
                {p.featured && <span className="mb-3 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">Mais escolhido</span>}
                <p className="font-display text-4xl font-bold">{p.price}<span className="text-base font-medium text-muted-foreground">/mês</span></p>
                <p className="mt-1 font-semibold">{p.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                <Link to="/auth" className={cn("mt-6 flex items-center justify-center rounded-full py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]", p.featured ? "bg-arctic text-primary-foreground" : "border border-border bg-secondary text-foreground")}>
                  Começar grátis
                </Link>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex items-center gap-2.5"><span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary/20 text-primary"><Check className="h-3 w-3" /></span>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-28">
          <div className="rounded-3xl border border-primary/30 bg-arctic p-10 text-center md:p-14">
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">Organize o próximo mês hoje.</h2>
            <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">Cadastre seus clientes e crie a primeira leva em menos de 5 minutos.</p>
            <Link to="/auth" className="mt-7 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-semibold text-foreground transition-transform hover:scale-[1.03]">
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AlvasharFlow
      </footer>
    </div>
  );
}

function BoardPreview() {
  const cols = [
    { name: "Recebido", items: ["Reels 01", "Reels 02", "Corte podcast"] },
    { name: "Editando", items: ["Reels 03", "VSL nova"] },
    { name: "Revisão", items: ["Reels 04"] },
    { name: "Concluído", items: ["Reels 05", "Reels 06", "Teaser"] },
  ];
  return (
    <div className="relative rounded-2xl border border-border bg-card/70 p-4 text-left shadow-[0_40px_120px_-40px_oklch(0_0_0/0.8)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold">Roney · Novembro</p>
          <p className="text-xs text-muted-foreground">6/9 concluídos</p>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 bg-arctic" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cols.map((c) => (
          <div key={c.name} className="rounded-xl border border-border/70 bg-background/40 p-2.5">
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{c.name} · {c.items.length}</p>
            <div className="space-y-1.5">
              {c.items.map((i) => (
                <div key={i} className="rounded-lg border border-border/70 bg-card px-2.5 py-2 text-xs font-medium">{i}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
