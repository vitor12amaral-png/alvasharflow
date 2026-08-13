import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="bg-[linear-gradient(180deg,var(--foreground),color-mix(in_oklab,var(--foreground)_62%,transparent))] bg-clip-text font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-transparent md:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
