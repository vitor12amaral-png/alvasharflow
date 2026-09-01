import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Agrupa ações secundárias atrás de um botão "…" para reduzir poluição visual.
 */
export function MoreMenu({ children, label = "Mais opções", className }: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground transition hover:text-foreground",
            className,
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-1 p-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Item padrão do menu "…" (usa botão de largura total). */
export function MoreMenuItem({ onClick, active, children }: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-muted",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}
