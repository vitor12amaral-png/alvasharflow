import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { STAGE_LABEL, type VideoStatus } from "@/lib/video-workflow";

export const NEXT_ACTION: Partial<Record<VideoStatus, { status: VideoStatus; label: string }>> = {
  recebido: { status: "briefing", label: "Preparar briefing" },
  briefing: { status: "fila", label: "Colocar na fila" },
  fila: { status: "editando", label: "Iniciar edição" },
  organizacao: { status: "editando", label: "Iniciar edição" },
  editando: { status: "revisao", label: "Enviar para revisão" },
  revisao: { status: "aguardando_cliente", label: "Enviar ao cliente" },
  aguardando_cliente: { status: "aprovado", label: "Marcar aprovado" },
  alteracoes: { status: "editando", label: "Retomar edição" },
  aprovado: { status: "entregue", label: "Marcar entregue" },
};

export function useWorkflowTeam() {
  const { data: me } = useCurrentUser();
  return useQuery({
    queryKey: ["workflow-team", me?.workspaceId], enabled: !!me?.workspaceId,
    queryFn: async () => {
      if (!me?.workspaceId) return [];
      const members = await supabase.from("workspace_members").select("user_id").eq("workspace_id", me.workspaceId);
      if (members.error) throw members.error;
      const ids = (members.data ?? []).map(m => m.user_id);
      if (!ids.length) return [];
      const profiles = await supabase.from("profiles").select("id, full_name").in("id", ids);
      if (profiles.error) throw profiles.error;
      return profiles.data ?? [];
    },
  });
}

const FIELD_LABEL: Record<string, string> = {
  title: "Título", description: "Descrição", due_date: "Prazo", due_time: "Horário",
  competence_month: "Mês da leva", estimated_hours: "Estimativa (h)", position: "Ordem",
  priority: "Prioridade", raw_files_link: "Material bruto", final_file_link: "Entrega final",
  batch_id: "Leva", batch_label: "Nome da leva",
};

export function VideoHistory({ videoId }: { videoId: string }) {
  const { data: team } = useWorkflowTeam();
  const { data, isPending, isError } = useQuery({
    queryKey: ["video-history", videoId],
    queryFn: async () => {
      const result = await supabase.from("activity_log").select("id, action, metadata, actor_id, created_at")
        .eq("entity_type", "video").eq("entity_id", videoId).order("created_at", { ascending: false }).limit(50);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  return <section className="border-t border-border pt-4">
    <h3 className="mb-3 text-sm font-semibold">Histórico de alterações</h3>
    {isPending && <p className="text-xs text-muted-foreground">Carregando histórico…</p>}
    {isError && <p className="text-xs text-destructive">Não foi possível carregar o histórico.</p>}
    {data?.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma alteração registrada.</p>}
    <ol className="space-y-4 border-l border-border pl-4">{data?.map(row => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const stage = (value: unknown) => STAGE_LABEL[value as VideoStatus] ?? String(value ?? "—");
      let description = row.action === "created" ? "Vídeo criado" : row.action === "deleted" ? "Vídeo excluído" : "Vídeo atualizado";
      if (row.action === "status_changed") description = `${stage(meta.from)} → ${stage(meta.to)}`;
      if (row.action === "assigned") description = `Responsável: ${team?.find(p => p.id === meta.editor_id)?.full_name ?? (meta.editor_id ? "Editor" : "Sem responsável")}`;
      if (row.action === "client_approved") description = "Cliente aprovou o vídeo";
      if (row.action === "client_requested_changes") description = "Cliente solicitou alterações";
      const changes = meta.changes as Record<string, { from: unknown; to: unknown }> | undefined;
      return <li key={row.id} className="text-xs">
        <p className="font-medium">{description}</p>
        {changes && Object.entries(changes).map(([key, change]) => <p key={key} className="mt-1 break-words text-muted-foreground">{FIELD_LABEL[key] ?? key}: {String(change.from ?? "Não definido")} → {String(change.to ?? "Não definido")}</p>)}
        <p className="mt-1 text-[11px] text-muted-foreground">{team?.find(p => p.id === row.actor_id)?.full_name ?? (row.actor_id ? "Equipe" : "Cliente / sistema")} · {new Date(row.created_at).toLocaleString("pt-BR")}</p>
      </li>;
    })}</ol>
  </section>;
}