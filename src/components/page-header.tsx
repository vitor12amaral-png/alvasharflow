import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
