import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireWorkspace } from "../supabase";

export default defineTool({
  name: "list_videos",
  title: "Listar vídeos",
  description: "Lista vídeos do workspace, com filtros por status, cliente e prazo.",
  inputSchema: {
    status: z.enum(["recebido", "briefing", "organizacao", "fila", "editando", "revisao", "aguardando_cliente", "alteracoes", "aprovado", "entregue"])
      .optional()
      .describe("Filtra por etapa do workflow."),
    client_name: z.string().optional().describe("Filtro parcial pelo nome do cliente."),
    due_before: z.string().optional().describe("Somente vídeos com prazo até esta data (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de vídeos (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, client_name, due_before, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Não autenticado.");
    const { supabase, workspaceId } = await requireWorkspace(ctx);

    let clientId: string | undefined;
    if (client_name) {
      const { data: matches } = await supabase
        .from("clients")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .ilike("name", `%${client_name}%`)
        .limit(5);
      if (!matches || matches.length === 0) return fail(`Cliente "${client_name}" não encontrado.`);
      if (matches.length > 1) return ok({ needs_clarification: true, candidates: matches });
      clientId = matches[0].id;
    }

    let q = supabase
      .from("videos")
      .select("id, title, status, priority, due_date, client_id, clients(name)")
      .eq("workspace_id", workspaceId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    if (clientId) q = q.eq("client_id", clientId);
    if (due_before) q = q.lte("due_date", due_before);

    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ videos: data ?? [] });
  },
});
