import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ListChecks, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx";
import { toast } from "sonner";

export type ChecklistItem = { label: string; done: boolean };

/** Normaliza o JSON salvo no banco (aceita lista de textos ou de objetos). */
export function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) =>
      typeof i === "string"
        ? { label: i, done: false }
        : i && typeof i === "object" && "label" in (i as Record<string, unknown>)
          ? { label: String((i as { label: unknown }).label), done: Boolean((i as { done?: unknown }).done) }
          : null,
    )
    .filter(Boolean) as ChecklistItem[];
}

/** Checklist de entrega do vídeo, com aplicação de template do workspace. */
export function VideoChecklist({
  videoId,
  workspaceId,
  value,
}: {
  videoId: string;
  workspaceId: string | null;
  value: unknown;
}) {
  const qc = useQueryClient();
  const items = useMemo(() => parseChecklist(value), [value]);
  const [novo, setNovo] = useState("");

  const { data: templates } = useQuery({
    queryKey: ["project-templates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("id, name, checklist")
        .eq("workspace_id", workspaceId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (next: ChecklistItem[]) => {
      const { error } = await supabase.from("videos").update({ checklist: next }).eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-detail", videoId] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  function update(next: ChecklistItem[]) {
    save.mutate(next);
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" /> Checklist de entrega
        </p>
        {items.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {done}/{items.length} · {pct}%
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="space-y-1">
        {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item ainda.</p>}
        {items.map((it, idx) => (
          <div key={`${it.label}-${idx}`} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/40">
            <Checkbox
              checked={it.done}
              onCheckedChange={(v) => {
                if (v) sfx.success();
                update(items.map((x, i) => (i === idx ? { ...x, done: Boolean(v) } : x)));
              }}
            />
            <span className={cn("flex-1 text-xs", it.done && "text-muted-foreground line-through")}>{it.label}</span>
            <button
              onClick={() => update(items.filter((_, i) => i !== idx))}
              className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
              aria-label="Remover item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && novo.trim()) {
              update([...items, { label: novo.trim(), done: false }]);
              setNovo("");
            }
          }}
          placeholder="Novo item do checklist…"
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!novo.trim() || save.isPending}
          onClick={() => {
            update([...items, { label: novo.trim(), done: false }]);
            setNovo("");
          }}
        >
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {(templates ?? []).length > 0 && (
        <div className="mt-2">
          <Select
            value=""
            onValueChange={(id) => {
              const t = (templates ?? []).find((x) => x.id === id);
              if (!t) return;
              const tpl = parseChecklist(t.checklist);
              if (!tpl.length) { toast.error("Esse template não tem checklist."); return; }
              const existentes = new Set(items.map((i) => i.label));
              update([...items, ...tpl.filter((i) => !existentes.has(i.label))]);
              toast.success(`Checklist "${t.name}" aplicado`);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Aplicar template de checklist…" />
            </SelectTrigger>
            <SelectContent>
              {(templates ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
