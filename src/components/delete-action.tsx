import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  /** Tabela do banco onde o registro vive */
  table: string;
  /** ID (ou lista de IDs) a excluir */
  id: string | string[];
  /** Texto no topo do diálogo */
  title?: string;
  /** Explicação da consequência */
  description?: string;
  /** Mensagem de sucesso */
  successMessage?: string;
  /** Chaves de query a invalidar após excluir */
  invalidate?: (string | unknown[])[];
  /** Callback extra após excluir */
  onDeleted?: () => void;
  /** Aparência do gatilho */
  variant?: "icon" | "button" | "menu";
  label?: string;
  className?: string;
};

export function DeleteAction({
  table,
  id,
  title = "Excluir item?",
  description = "Esta ação é permanente e não pode ser desfeita.",
  successMessage = "Excluído",
  invalidate = [],
  onDeleted,
  variant = "icon",
  label = "Excluir",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const ids = Array.isArray(id) ? id : [id];

  async function run() {
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from(table as never).delete().in("id", ids);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(successMessage);
    setOpen(false);
    for (const key of invalidate) {
      qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
    }
    onDeleted?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive",
              className,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : variant === "menu" ? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10",
              className,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {label}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-xs font-medium text-destructive transition hover:bg-destructive/20",
              className,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {label}
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void run();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
