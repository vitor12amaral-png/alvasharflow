import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireWorkspace } from "../supabase";

export default defineTool({
  name: "list_clients",
  title: "Listar clientes",
  description: "Lista os clientes do workspace ativo, opcionalmente filtrando por nome.",
  inputSchema: {
    query: z.string().optional().describe("Filtro parcial pelo nome do cliente."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de clientes (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Não autenticado.");
    const { supabase, workspaceId } = await requireWorkspace(ctx);
    let q = supabase
      .from("clients")
      .select("id, name, status, company, email, whatsapp")
      .eq("workspace_id", workspaceId)
      .order("name")
      .limit(limit ?? 25);
    if (query) q = q.ilike("name", `%${query}%`);
    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ clients: data ?? [] });
  },
});
