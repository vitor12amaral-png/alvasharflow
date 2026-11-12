import { useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import type { MonthPoint } from "@/lib/monthly-series";

const FULL: Record<string, string> = { jan: "Janeiro", fev: "Fevereiro", mar: "Março", abr: "Abril", mai: "Maio", jun: "Junho", jul: "Julho", ago: "Agosto", set: "Setembro", out: "Outubro", nov: "Novembro", dez: "Dezembro" };

/** Barras mensais estilo Nubank: cada barra é um mês; passe o mouse para ver o desempenho. */
export function MonthlyBars({ points, title = "Desempenho por mês", metric = "done", className }: {
  points: MonthPoint[]; title?: string; metric?: "done" | "revenue"; className?: string;
}) {
  const [active, setActive] = useState<number>(points.length - 1);
  const val = (p: MonthPoint) => (metric === "revenue" ? p.revenue : p.done);
  const max = Math.max(1, ...points.map((p) => Math.max(val(p), metric === "done" ? p.total : 0)));
  const p = points[active] ?? points[points.length - 1];
  if (!p) return null;
  const verdict = p.total === 0 ? "Sem demandas" : p.tone === "bad" ? "Abaixo do mês anterior" : p.pct >= 80 ? "Indo muito bem" : p.tone === "good" ? "Indo bem" : "Em andamento";
  const Trend = p.delta === null ? Minus : p.delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-landing-panel/70 p-4 backdrop-blur-xl", className)} onPointerLeave={() => setActive(points.length - 1)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{title} · {FULL[p.label]} {p.ym.slice(0, 4)}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight">
            {metric === "revenue" ? formatBRL(p.revenue) : <>{p.done}<span className="text-base text-muted-foreground">/{p.total} entregues</span></>}
          </p>
        </div>
        <div className="text-right">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            p.tone === "bad" ? "bg-destructive/15 text-destructive" : p.tone === "good" ? "bg-success/15 text-success" : "bg-foreground/[0.06] text-muted-foreground")}>
            <Trend className="h-3 w-3" />{p.delta === null ? "Sem comparação" : `${p.delta > 0 ? "+" : ""}${p.delta}% vs mês anterior`}
          </span>
          <p className="mt-1 text-[11px] text-muted-foreground">{verdict} · {p.pct}% concluído{metric === "done" && p.revenue > 0 ? ` · ${formatBRL(p.revenue)}` : ""}</p>
        </div>
      </div>
      <div className="mt-4 flex h-32 items-end gap-2 sm:gap-3">
        {points.map((pt, i) => {
          const h = (val(pt) / max) * 100;
          const ghost = metric === "done" ? (pt.total / max) * 100 : 0;
          const on = i === active;
          return (
            <button key={pt.ym} type="button" onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)}
              aria-label={`${FULL[pt.label]}: ${pt.done} de ${pt.total} entregues`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5 outline-none">
              <div className="relative flex w-full max-w-[44px] flex-1 items-end">
                {ghost > 0 && <div className="absolute bottom-0 w-full rounded-lg bg-foreground/[0.06]" style={{ height: `${ghost}%` }} />}
                <div className={cn("relative w-full rounded-lg transition-all duration-300",
                  pt.tone === "bad" ? "bg-destructive/70" : on ? "bg-[image:var(--gradient-cta)] shadow-[0_0_18px_-4px_var(--violet)]" : "bg-violet/45 group-hover:bg-violet/70")}
                  style={{ height: `${Math.max(val(pt) ? 6 : 2, h)}%` }} />
              </div>
              <span className={cn("text-[10px] capitalize", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{pt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
