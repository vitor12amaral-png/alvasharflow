import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

export const Route = createFileRoute("/api/copilot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", supabaseKey);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const { data: profile } = await supabase.from("profiles").select("current_workspace_id, full_name").eq("id", userId).maybeSingle();
        const workspaceId = profile?.current_workspace_id;
        if (!workspaceId) return new Response("No workspace", { status: 400 });

        const { data: membership } = await supabase.from("workspace_members").select("role").eq("user_id", userId).eq("workspace_id", workspaceId).maybeSingle();
        const wsRole = membership?.role ?? "editor";
        const canAdmin = wsRole === "owner" || wsRole === "admin";

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(body.messages)) return new Response("Messages required", { status: 400 });

        async function findClient(nameOrId: string) {
          const { data } = await supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).ilike("name", `%${nameOrId}%`).limit(5);
          return data ?? [];
        }

        const tools = {
          list_clients: tool({
            description: "Lista clientes do workspace para desambiguar nomes antes de criar vídeos/tarefas.",
            inputSchema: z.object({ query: z.string().nullable() }),
            execute: async ({ query }) => {
              const q = supabase.from("clients").select("id, name, status").eq("workspace_id", workspaceId).order("name").limit(20);
              const { data, error } = query ? await q.ilike("name", `%${query}%`) : await q;
              if (error) return { error: error.message };
              return { clients: data ?? [] };
            },
          }),
          create_client: tool({
            description: "Cria um novo cliente. Requer papel admin/owner.",
            inputSchema: z.object({
              name: z.string(),
              email: z.string().nullable(),
              whatsapp: z.string().nullable(),
              company: z.string().nullable(),
              package_size: z.enum(["p10", "p20", "p30", "custom"]).nullable(),
              total_videos: z.number().int().nullable(),
              delivery_method: z.enum(["drive", "dropbox", "wetransfer", "outro"]).nullable(),
              notes: z.string().nullable(),
            }),
            execute: async (input) => {
              if (!canAdmin) return { error: "Sem permissão. Peça a um admin do workspace." };
              const { data: c, error } = await supabase.from("clients").insert({
                workspace_id: workspaceId,
                name: input.name,
                email: input.email,
                whatsapp: input.whatsapp,
                company: input.company,
                delivery_method: input.delivery_method,
                notes: input.notes,
              }).select("id, name").single();
              if (error) return { error: error.message };
              if (input.package_size) {
                const totalVideos = input.total_videos ?? (input.package_size === "p10" ? 10 : input.package_size === "p20" ? 20 : input.package_size === "p30" ? 30 : 10);
                await supabase.from("client_packages").insert({
                  workspace_id: workspaceId,
                  client_id: c.id,
                  size: input.package_size,
                  total_videos: totalVideos,
                  price: 0,
                });
              }
              return { ok: true, client: c };
            },
          }),
          create_video: tool({
            description: "Cria um vídeo para um cliente. Use list_clients primeiro se o nome for ambíguo.",
            inputSchema: z.object({
              client_name: z.string(),
              title: z.string(),
              description: z.string().nullable(),
              priority: z.enum(["baixa", "media", "alta", "urgente"]).nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
            }),
            execute: async (input) => {
              const matches = await findClient(input.client_name);
              if (matches.length === 0) return { error: `Cliente "${input.client_name}" não encontrado.` };
              if (matches.length > 1) return { needs_clarification: true, candidates: matches };
              const { data, error } = await supabase.from("videos").insert({
                workspace_id: workspaceId,
                client_id: matches[0].id,
                title: input.title,
                description: input.description,
                priority: input.priority ?? "media",
                due_date: input.due_date,
                status: "recebido",
              }).select("id, title").single();
              if (error) return { error: error.message };
              return { ok: true, video: data, client: matches[0].name };
            },
          }),
          create_task: tool({
            description: "Cria uma tarefa do dia a dia.",
            inputSchema: z.object({
              title: z.string(),
              description: z.string().nullable(),
              priority: z.enum(["baixa", "media", "alta", "urgente"]).nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
              category: z.enum(["financeiro", "atendimento", "marketing", "edicao", "administrativo", "geral"]).nullable(),
              client_name: z.string().nullable(),
            }),
            execute: async (input) => {
              let clientId: string | null = null;
              if (input.client_name) {
                const matches = await findClient(input.client_name);
                if (matches.length === 1) clientId = matches[0].id;
              }
              const { data, error } = await supabase.from("tasks").insert({
                workspace_id: workspaceId,
                title: input.title,
                description: input.description,
                priority: input.priority ?? "media",
                due_date: input.due_date,
                category: input.category ?? "geral",
                client_id: clientId,
                assignee_id: userId,
                created_by: userId,
              }).select("id, title").single();
              if (error) return { error: error.message };
              return { ok: true, task: data };
            },
          }),
          create_marketing_script: tool({
            description: "Cria um roteiro de marketing.",
            inputSchema: z.object({
              title: z.string(),
              channel: z.enum(["instagram", "tiktok", "youtube", "linkedin"]).nullable(),
              content_type: z.enum(["reels", "post", "story", "carousel", "video_longo", "shorts", "artigo", "outro"]).nullable(),
              hook: z.string().nullable(),
              development: z.string().nullable(),
              cta: z.string().nullable(),
              client_name: z.string().nullable(),
            }),
            execute: async (input) => {
              if (!canAdmin) return { error: "Sem permissão." };
              let clientId: string | null = null;
              if (input.client_name) {
                const matches = await findClient(input.client_name);
                if (matches.length === 1) clientId = matches[0].id;
              }
              const { data, error } = await supabase.from("marketing_scripts").insert({
                workspace_id: workspaceId,
                title: input.title,
                channel: input.channel ?? "instagram",
                content_type: input.content_type ?? "reels",
                hook: input.hook,
                development: input.development,
                cta: input.cta,
                client_id: clientId,
              }).select("id, title").single();
              if (error) return { error: error.message };
              return { ok: true, script: data };
            },
          }),
          query_stats: tool({
            description: "Retorna contadores rápidos: clientes ativos, vídeos por status, tarefas em aberto.",
            inputSchema: z.object({}),
            execute: async () => {
              const [{ count: clients }, { data: videos }, { count: openTasks }] = await Promise.all([
                supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "ativo"),
                supabase.from("videos").select("status").eq("workspace_id", workspaceId),
                supabase.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "concluida"),
              ]);
              const byStatus: Record<string, number> = {};
              (videos ?? []).forEach((v) => { byStatus[v.status] = (byStatus[v.status] ?? 0) + 1; });
              return { active_clients: clients ?? 0, videos_by_status: byStatus, open_tasks: openTasks ?? 0 };
            },
          }),
        };

        const gateway = createLovableAiGatewayProvider(key);
        const today = new Date().toISOString().slice(0, 10);
        const system = `Você é o Copiloto do Cortex — um SaaS de gestão para agências de edição de vídeo. Data de hoje: ${today}. Usuário: ${profile?.full_name ?? "editor"} (papel: ${wsRole}).

Regras:
- Sempre confirme ações com o usuário APÓS executar, resumindo o que foi criado.
- Se faltar informação obrigatória (título, nome do cliente), pergunte antes de chamar a tool.
- Se o nome do cliente for ambíguo, use list_clients para desambiguar.
- Interprete "amanhã", "sexta", "próxima semana" em relação à data de hoje e converta para YYYY-MM-DD.
- Responda em português brasileiro, tom direto e curto.`;

        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system,
          messages: await convertToModelMessages(body.messages),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
