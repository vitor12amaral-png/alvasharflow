import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Ban } from "lucide-react";

/** Paleta de etiquetas de classificação. */
export const TAG_COLORS: { id: string; label: string; value: string }[] = [
  { id: "vermelho", label: "Vermelho", value: "oklch(0.68 0.19 25)" },
  { id: "laranja", label: "Laranja", value: "oklch(0.78 0.16 60)" },
  { id: "amarelo", label: "Amarelo", value: "oklch(0.85 0.15 95)" },
  { id: "verde", label: "Verde", value: "oklch(0.72 0.17 155)" },
  { id: "ciano", label: "Ciano", value: "oklch(0.75 0.13 200)" },
  { id: "azul", label: "Azul", value: "oklch(0.68 0.18 250)" },
  { id: "roxo", label: "Roxo", value: "oklch(0.68 0.18 300)" },
  { id: "rosa", label: "Rosa", value: "oklch(0.74 0.16 350)" },
  { id: "cinza", label: "Cinza", value: "oklch(0.62 0.02 260)" },
];

export function colorValue(color?: string | null) {
  if (!color) return null;
  return TAG_COLORS.find((c) => c.id === color)?.value ?? null;
}

/** Bolinha/faixa que mostra a cor de classificação de um item. */
export function ColorDot({ color, className }: { color?: string | null; className?: string }) {
  const v = colorValue(color);
  if (!v) return null;
  return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)} style={{ background: v }} />;
}

/**
 * Seletor de cor reutilizável. Atualiza a coluna `color` da tabela informada.
 */
export function ColorPicker({
  table,
  id,
  color,
  invalidate = [],
  className,
  size = "sm",
}: {
  table: string;
  id: string;
  color?: string | null;
  invalidate?: (string | unknown[])[];
  className?: string;
  size?: "sm" | "md";
}) {
  const qc = useQueryClient();
  const current = colorValue(color);

  async function set(next: string | null) {
    const { error } = await supabase.from(table as never).update({ color: next } as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidate.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="Cor de classificação"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 rounded-full border transition hover:scale-110",
            size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5",
            current ? "border-transparent" : "border-dashed border-muted-foreground/50",
            className,
          )}
          style={current ? { background: current } : undefined}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-5 gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => set(c.id)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition hover:scale-110",
                color === c.id ? "border-foreground" : "border-transparent",
              )}
              style={{ background: c.value }}
            />
          ))}
          <button
            title="Sem cor"
            onClick={() => set(null)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground transition hover:text-foreground"
          >
            <Ban className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
