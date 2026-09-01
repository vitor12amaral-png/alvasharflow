import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickerClient = { id: string; name: string; parent_client_id: string | null };

/**
 * Escolhe (ou cria) o subcliente/marca de um cliente principal.
 * Usado na seleção múltipla do Workflow e no badge dos cartões.
 */
export function SubclientPicker({
  clients,
  parentId,
  currentId,
  onPick,
  children,
  align = "start",
}: {
  clients: PickerClient[];
  parentId: string | null;
  currentId?: string | null;
  onPick: (clientId: string) => void;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const parent = parentId ? clients.find((c) => c.id === parentId) ?? null : null;
  const subs = parentId ? clients.filter((c) => c.parent_client_id === parentId) : [];

  async function createSub() {
    const trimmed = name.trim();
    if (!trimmed || !parentId) return;
    setCreating(true);
    const { data: parentRow, error: pe } = await supabase
      .from("clients").select("workspace_id").eq("id", parentId).single();
    if (pe) { setCreating(false); toast.error(pe.message); return; }
    const { data, error } = await supabase
      .from("clients")
      .insert({ name: trimmed, parent_client_id: parentId, workspace_id: parentRow.workspace_id })
      .select("id")
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setName("");
    await qc.invalidateQueries({ queryKey: ["clients-min"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    onPick(data.id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-2">
        <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {parent ? `Marcas de ${parent.name}` : "Selecionar subcliente"}
        </p>
        {!parentId ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Selecione vídeos de um mesmo cliente principal para vincular a uma marca.
          </p>
        ) : (
          <>
            <div className="max-h-52 space-y-0.5 overflow-y-auto">
              <button
                onClick={() => { onPick(parentId); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted",
                  currentId === parentId && "bg-muted text-primary",
                )}
              >
                {currentId === parentId ? <Check className="h-3 w-3" /> : <span className="w-3" />}
                Sem marca ({parent?.name})
              </button>
              {subs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onPick(s.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted",
                    currentId === s.id && "bg-muted text-primary",
                  )}
                >
                  {currentId === s.id ? <Check className="h-3 w-3" /> : <span className="w-3" />}
                  {s.name}
                </button>
              ))}
              {subs.length === 0 && (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">Nenhuma marca cadastrada ainda.</p>
              )}
            </div>
            <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createSub(); } }}
                placeholder="Nova marca…"
                className="h-8 text-xs"
              />
              <Button size="sm" className="h-8" disabled={!name.trim() || creating} onClick={() => void createSub()}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
