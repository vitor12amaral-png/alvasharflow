import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger" | "muted";

const toneText: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};
const toneBar: Record<Tone, string> = {
  primary: "bg-primary shadow-[0_0_12px_var(--primary)]",
  success: "bg-success shadow-[0_0_12px_var(--success)]",
  warning: "bg-warning shadow-[0_0_12px_var(--warning)]",
  danger: "bg-destructive shadow-[0_0_12px_var(--destructive)]",
  muted: "bg-muted-foreground",
};

/** Indicador no formato da prévia da página de vendas: rótulo miúdo, número grande, nota colorida e barra opcional. */
export function StatCard({
  label, value, note, tone = "primary", icon: Icon, progress, series, footer, className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  /** 0-100: desenha uma barra de progresso real. */
  progress?: number;
  /** Valores reais para a linha de tendência; sem dados, nenhuma linha é desenhada. */
  series?: number[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border/60 bg-landing-panel/70 p-4 backdrop-blur-xl transition duration-300 hover:border-primary/30", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-landing ring-1 ring-inset ring-border/60", toneText[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-2">
        <p className="whitespace-nowrap font-display text-2xl font-semibold tracking-tight">{value}</p>
        {note && <span className={cn("pb-1 text-[11px] font-semibold", toneText[tone])}>{note}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-landing ring-1 ring-inset ring-border/50">
          <div className={cn("h-full rounded-full transition-all duration-700", toneBar[tone])} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
      {series && series.length > 1 && <Sparkline values={series} className={toneText[tone]} />}
      {footer && <div className="mt-2 text-[11px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${(22 - ((v - min) / span) * 20).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={cn("mt-2 h-5 w-full", className)} fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Estado vazio consistente para colunas e listas. */
export function EmptyState({ icon: Icon, title, hint, action, className }: { icon?: LucideIcon; title: string; hint?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 bg-landing/40 px-3 py-6 text-center", className)}>
      {Icon && (
        <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <p className="text-xs font-medium text-foreground/80">{title}</p>
      {hint && <p className="max-w-[220px] text-[11px] text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
