import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-rise flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight md:text-4xl">
          <span className="text-arctic">{title}</span>
        </h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
