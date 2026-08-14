import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireWorkspace } from "../supabase";

export default defineTool({
  name: "update_video",
  title: "Atualizar vídeo",
  description: "Atualiza status, prioridade ou prazo de um vídeo existente (pelo id).",
  inputSchema: {
    video_id: z.string().uuid().describe("Id do vídeo (use list_videos para descobrir)."),
    status: z.enum(["recebido", "briefing", "organizacao", "fila", "editando", "revisao", "aguardando_cliente", "alteracoes", "aprovado", "entregue"]).optional(),
    priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    due_date: z.string().nullable().optional().describe("Novo prazo YYYY-MM-DD, ou null para remover."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ video_id, status, priority, due_date }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Não autenticado.");
    const { supabase, workspaceId } = await requireWorkspace(ctx);

    const patch: { status?: typeof status; priority?: typeof priority; due_date?: string | null } = {};
    if (status) patch.status = status;
    if (priority) patch.priority = priority;
    if (due_date !== undefined) patch.due_date = due_date;
    if (Object.keys(patch).length === 0) return fail("Informe pelo menos um campo para atualizar.");

    const { data, error } = await supabase
      .from("videos")
      .update(patch)
      .eq("id", video_id)
      .eq("workspace_id", workspaceId)
      .select("id, title, status, priority, due_date")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Vídeo não encontrado ou sem permissão.");
    return ok({ video: data });
  },
});
