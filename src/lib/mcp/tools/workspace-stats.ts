import { defineTool } from "@lovable.dev/mcp-js";
import { fail, ok, requireWorkspace } from "../supabase";

export default defineTool({
  name: "workspace_stats",
  title: "Resumo do workspace",
  description: "Retorna clientes ativos, vídeos por status e tarefas em aberto do workspace ativo.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Não autenticado.");
    const { supabase, workspaceId } = await requireWorkspace(ctx);

    const [clientsRes, videosRes, tasksRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "ativo"),
      supabase.from("videos").select("status").eq("workspace_id", workspaceId),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("status", "concluida"),
    ]);

    const byStatus: Record<string, number> = {};
    (videosRes.data ?? []).forEach((v) => {
      byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
    });

    return ok({
      active_clients: clientsRes.count ?? 0,
      videos_by_status: byStatus,
      open_tasks: tasksRes.count ?? 0,
    });
  },
});
