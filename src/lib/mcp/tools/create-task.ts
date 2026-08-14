import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireWorkspace } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Criar tarefa",
  description: "Cria uma tarefa do dia a dia no workspace ativo, opcionalmente ligada a um cliente.",
  inputSchema: {
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    due_date: z.string().optional().describe("Prazo YYYY-MM-DD."),
    category: z
      .enum(["financeiro", "atendimento", "marketing", "edicao", "administrativo", "geral"])
      .optional(),
    client_name: z.string().optional().describe("Cliente relacionado (opcional)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, priority, due_date, category, client_name }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Não autenticado.");
    const { supabase, workspaceId, userId } = await requireWorkspace(ctx);

    let clientId: string | null = null;
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

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        title,
        description: description ?? null,
        priority: priority ?? "media",
        due_date: due_date ?? null,
        category: category ?? "geral",
        client_id: clientId,
        assignee_id: userId,
        created_by: userId,
      })
      .select("id, title, due_date, priority")
      .single();
    if (error) return fail(error.message);
    return ok({ task: data });
  },
});
