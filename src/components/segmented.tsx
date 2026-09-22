import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx";
import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
};

/**
 * Controle segmentado estilo Apple: pílula deslizante, vidro translúcido
 * e troca instantânea (sem re-render pesado — apenas transform da pílula).
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  size?: "sm" | "md";
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const w = 100 / options.length;

  return (
    <div
      role="tablist"
      className={cn(
        "relative isolate inline-flex select-none rounded-lg border border-border/70 bg-muted/35 p-[3px]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-[3px] left-[3px] -z-10 rounded-md bg-primary/10 transition-transform duration-200 ease-out"
        style={{
          width: `calc(${w}% - 3px)`,
          transform: `translateX(calc(${index * 100}% + ${index * 3}px))`,
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                sfx.select();
                onChange(o.value);
              }
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-200",
              size === "sm" ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
              active ? "font-semibold text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {o.icon}
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active ? "bg-primary/15 text-primary" : "bg-muted/70 text-muted-foreground",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
