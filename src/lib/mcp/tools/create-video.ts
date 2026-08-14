import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireWorkspace } from "../supabase";

export default defineTool({
  name: "create_video",
  title: "Criar vídeo",
  description: "Cria uma demanda de vídeo para um cliente do workspace.",
  inputSchema: {
    client_name: z.string().describe("Nome (ou parte) do cliente."),
    title: z.string().min(1).describe("Título do vídeo."),
    description: z.string().optional(),
    priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    due_date: z.string().optional().describe("Prazo no formato YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ client_name, title, description, priority, due_date }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Não autenticado.");
    const { supabase, workspaceId } = await requireWorkspace(ctx);

    const { data: matches } = await supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${client_name}%`)
      .limit(5);
    if (!matches || matches.length === 0) return fail(`Cliente "${client_name}" não encontrado.`);
    if (matches.length > 1) return ok({ needs_clarification: true, candidates: matches });

    const { data, error } = await supabase
      .from("videos")
      .insert({
        workspace_id: workspaceId,
        client_id: matches[0].id,
        title,
        description: description ?? null,
        priority: priority ?? "media",
        due_date: due_date ?? null,
        status: "recebido",
      })
      .select("id, title, status, due_date")
      .single();
    if (error) return fail(error.message);
    return ok({ video: data, client: matches[0].name });
  },
});
