import { Keyboard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Atalhos escondidos por padrão: um ícone discreto revela a lista sob demanda.
 */
export function ShortcutsHint({ items }: { items: [string, string][] }) {
  if (!items.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Atalhos de teclado"
          aria-label="Atalhos de teclado"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground transition hover:text-foreground"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Atalhos de teclado
        </p>
        <div className="space-y-0.5">
          {items.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-sm px-1 py-1 text-xs">
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">{key}</kbd>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
