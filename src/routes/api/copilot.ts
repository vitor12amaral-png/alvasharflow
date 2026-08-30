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
          const { data } = await supabase.from("clients").select("id, name").eq("workspace_id", workspaceId!).ilike("name", `%${nameOrId}%`).limit(5);
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
              delivery_method: z.enum(["drive", "dropbox", "wetransfer", "upload_interno"]).nullable(),
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
          update_client: tool({
            description: "Atualiza dados de um cliente: status (ativo/pausado/inativo), motivo/retorno da pausa, contatos, valor por vídeo, instagram, notas.",
            inputSchema: z.object({
              client_name: z.string(),
              name: z.string().nullable(),
              status: z.enum(["ativo", "pausado", "inativo"]).nullable(),
              pause_reason: z.string().nullable(),
              pause_until: z.string().nullable().describe("YYYY-MM-DD"),
              whatsapp: z.string().nullable(),
              email: z.string().nullable(),
              instagram: z.string().nullable(),
              price_per_video: z.number().nullable(),
              notes: z.string().nullable(),
            }),
            execute: async ({ client_name, ...fields }) => {
              const matches = await findClient(client_name);
              if (matches.length === 0) return { error: `Cliente "${client_name}" não encontrado.` };
              if (matches.length > 1) return { needs_clarification: true, candidates: matches };
              const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
              if (Object.keys(patch).length === 0) return { error: "Nada para atualizar." };
              const { error } = await supabase.from("clients").update(patch as never).eq("id", matches[0].id);
              if (error) return { error: error.message };
              return { ok: true, client: matches[0].name, updated: Object.keys(patch) };
            },
          }),
          list_videos: tool({
            description: "Lista vídeos com filtros de cliente, status, prioridade e prazo. Use para responder perguntas e para achar o id de um vídeo antes de atualizar.",
            inputSchema: z.object({
              client_name: z.string().nullable(),
              status: z.enum(["recebido", "briefing", "organizacao", "fila", "editando", "revisao", "aguardando_cliente", "alteracoes", "aprovado", "entregue"]).nullable(),
              search: z.string().nullable(),
              overdue_only: z.boolean().nullable(),
              limit: z.number().int().nullable(),
            }),
            execute: async (input) => {
              let clientId: string | null = null;
              if (input.client_name) {
                const matches = await findClient(input.client_name);
                if (matches.length === 0) return { error: `Cliente "${input.client_name}" não encontrado.` };
                if (matches.length > 1) return { needs_clarification: true, candidates: matches };
                clientId = matches[0].id;
              }
              let q = supabase.from("videos")
                .select("id, title, status, priority, due_date, client_id, clients(name)")
                .eq("workspace_id", workspaceId)
                .order("due_date", { ascending: true, nullsFirst: false })
                .limit(input.limit ?? 30);
              if (clientId) q = q.eq("client_id", clientId);
              if (input.status) q = q.eq("status", input.status);
              if (input.search) q = q.ilike("title", `%${input.search}%`);
              if (input.overdue_only) q = q.lt("due_date", new Date().toISOString().slice(0, 10)).neq("status", "entregue");
              const { data, error } = await q;
              if (error) return { error: error.message };
              return { videos: data ?? [] };
            },
          }),
          update_video: tool({
            description: "Atualiza um vídeo: status, prioridade, prazo, título, descrição, editor responsável ou links. Passe video_id (de list_videos) ou título + cliente.",
            inputSchema: z.object({
              video_id: z.string().nullable(),
              client_name: z.string().nullable(),
              title_match: z.string().nullable(),
              status: z.enum(["recebido", "briefing", "organizacao", "fila", "editando", "revisao", "aguardando_cliente", "alteracoes", "aprovado", "entregue"]).nullable(),
              priority: z.enum(["baixa", "media", "alta", "urgente"]).nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
              new_title: z.string().nullable(),
              description: z.string().nullable(),
              final_file_link: z.string().nullable(),
            }),
            execute: async (input) => {
              let id = input.video_id;
              if (!id) {
                if (!input.title_match) return { error: "Informe video_id ou title_match." };
                let q = supabase.from("videos").select("id, title, clients(name)").eq("workspace_id", workspaceId).ilike("title", `%${input.title_match}%`).limit(5);
                if (input.client_name) {
                  const matches = await findClient(input.client_name);
                  if (matches.length === 1) q = q.eq("client_id", matches[0].id);
                }
                const { data } = await q;
                if (!data || data.length === 0) return { error: "Vídeo não encontrado." };
                if (data.length > 1) return { needs_clarification: true, candidates: data };
                id = data[0].id;
              }
              const patch: Record<string, unknown> = {};
              if (input.status) patch.status = input.status;
              if (input.priority) patch.priority = input.priority;
              if (input.due_date) patch.due_date = input.due_date;
              if (input.new_title) patch.title = input.new_title;
              if (input.description) patch.description = input.description;
              if (input.final_file_link) patch.final_file_link = input.final_file_link;
              if (Object.keys(patch).length === 0) return { error: "Nada para atualizar." };
              const { data, error } = await supabase.from("videos").update(patch as never).eq("id", id).select("id, title, status, due_date").single();
              if (error) return { error: error.message };
              return { ok: true, video: data };
            },
          }),
          delete_video: tool({
            description: "Exclui um vídeo. Só use após o usuário confirmar explicitamente.",
            inputSchema: z.object({ video_id: z.string(), confirmed: z.boolean() }),
            execute: async ({ video_id, confirmed }) => {
              if (!confirmed) return { error: "Peça confirmação do usuário antes de excluir." };
              const { error } = await supabase.from("videos").delete().eq("id", video_id);
              if (error) return { error: error.message };
              return { ok: true };
            },
          }),
          create_video_batch: tool({
            description: "Cria uma leva de vídeos numerados para um cliente (ex.: 10 vídeos 'Reels #1..#10').",
            inputSchema: z.object({
              client_name: z.string(),
              quantity: z.number().int(),
              title_prefix: z.string(),
              priority: z.enum(["baixa", "media", "alta", "urgente"]).nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
            }),
            execute: async (input) => {
              const matches = await findClient(input.client_name);
              if (matches.length === 0) return { error: `Cliente "${input.client_name}" não encontrado.` };
              if (matches.length > 1) return { needs_clarification: true, candidates: matches };
              const qty = Math.min(Math.max(input.quantity, 1), 60);
              const rows = Array.from({ length: qty }, (_, i) => ({
                workspace_id: workspaceId,
                client_id: matches[0].id,
                title: `${input.title_prefix} #${i + 1}`,
                priority: input.priority ?? "media",
                due_date: input.due_date,
                status: "recebido" as const,
              }));
              const { data, error } = await supabase.from("videos").insert(rows).select("id");
              if (error) return { error: error.message };
              return { ok: true, created: data?.length ?? 0, client: matches[0].name };
            },
          }),
          list_tasks: tool({
            description: "Lista tarefas do dia a dia, com filtro de status e prazo.",
            inputSchema: z.object({
              status: z.enum(["aberta", "concluida"]).nullable(),
              due_before: z.string().nullable().describe("YYYY-MM-DD"),
              search: z.string().nullable(),
            }),
            execute: async (input) => {
              let q = supabase.from("tasks").select("id, title, status, priority, due_date, category").eq("workspace_id", workspaceId).order("due_date", { nullsFirst: false }).limit(40);
              if (input.status) q = q.eq("status", input.status);
              if (input.due_before) q = q.lte("due_date", input.due_before);
              if (input.search) q = q.ilike("title", `%${input.search}%`);
              const { data, error } = await q;
              if (error) return { error: error.message };
              return { tasks: data ?? [] };
            },
          }),
          update_task: tool({
            description: "Atualiza ou conclui uma tarefa. Passe task_id (de list_tasks) ou title_match.",
            inputSchema: z.object({
              task_id: z.string().nullable(),
              title_match: z.string().nullable(),
              status: z.enum(["aberta", "concluida"]).nullable(),
              priority: z.enum(["baixa", "media", "alta", "urgente"]).nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
              new_title: z.string().nullable(),
            }),
            execute: async (input) => {
              let id = input.task_id;
              if (!id) {
                if (!input.title_match) return { error: "Informe task_id ou title_match." };
                const { data } = await supabase.from("tasks").select("id, title").eq("workspace_id", workspaceId).ilike("title", `%${input.title_match}%`).limit(5);
                if (!data || data.length === 0) return { error: "Tarefa não encontrada." };
                if (data.length > 1) return { needs_clarification: true, candidates: data };
                id = data[0].id;
              }
              const patch: Record<string, unknown> = {};
              if (input.status) patch.status = input.status;
              if (input.priority) patch.priority = input.priority;
              if (input.due_date) patch.due_date = input.due_date;
              if (input.new_title) patch.title = input.new_title;
              if (Object.keys(patch).length === 0) return { error: "Nada para atualizar." };
              const { data, error } = await supabase.from("tasks").update(patch as never).eq("id", id).select("id, title, status").single();
              if (error) return { error: error.message };
              return { ok: true, task: data };
            },
          }),
          manage_lead: tool({
            description: "Cria ou atualiza um lead do CRM (etapa, valor estimado, follow-up, notas).",
            inputSchema: z.object({
              action: z.enum(["create", "update"]),
              name: z.string(),
              company: z.string().nullable(),
              phone: z.string().nullable(),
              email: z.string().nullable(),
              source: z.string().nullable(),
              estimated_value: z.number().nullable(),
              stage: z.enum(["novo", "conversa", "proposta", "follow_up", "fechando", "fechado", "perdido"]).nullable(),
              next_follow_up: z.string().nullable().describe("YYYY-MM-DD"),
              notes: z.string().nullable(),
            }),
            execute: async ({ action, name, ...fields }) => {
              const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
              if (action === "create") {
                const { data, error } = await supabase.from("leads").insert({ workspace_id: workspaceId, name, created_by: userId, ...patch } as never).select("id, name, stage").single();
                if (error) return { error: error.message };
                return { ok: true, lead: data };
              }
              const { data: found } = await supabase.from("leads").select("id, name").eq("workspace_id", workspaceId).ilike("name", `%${name}%`).limit(5);
              if (!found || found.length === 0) return { error: `Lead "${name}" não encontrado.` };
              if (found.length > 1) return { needs_clarification: true, candidates: found };
              const { data, error } = await supabase.from("leads").update(patch as never).eq("id", found[0].id).select("id, name, stage").single();
              if (error) return { error: error.message };
              return { ok: true, lead: data };
            },
          }),
          list_leads: tool({
            description: "Lista leads do CRM por etapa, com follow-ups pendentes.",
            inputSchema: z.object({ stage: z.string().nullable() }),
            execute: async ({ stage }) => {
              let q = supabase.from("leads").select("id, name, company, stage, estimated_value, next_follow_up, last_contact_at").eq("workspace_id", workspaceId).limit(50);
              if (stage) q = q.eq("stage", stage as never);
              const { data, error } = await q;
              if (error) return { error: error.message };
              return { leads: data ?? [] };
            },
          }),
          manage_package: tool({
            description: "Cria ou ajusta o pacote de um cliente (tamanho, total de vídeos, preço, valor por vídeo, status).",
            inputSchema: z.object({
              client_name: z.string(),
              size: z.enum(["p10", "p20", "p30", "custom"]).nullable(),
              total_videos: z.number().int().nullable(),
              price: z.number().nullable(),
              price_per_video: z.number().nullable(),
              status: z.enum(["ativo", "expirado", "renovado", "cancelado", "concluido", "arquivado"]).nullable(),
            }),
            execute: async ({ client_name, ...fields }) => {
              if (!canAdmin) return { error: "Sem permissão." };
              const matches = await findClient(client_name);
              if (matches.length === 0) return { error: `Cliente "${client_name}" não encontrado.` };
              if (matches.length > 1) return { needs_clarification: true, candidates: matches };
              const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
              const { data: existing } = await supabase.from("client_packages").select("id").eq("client_id", matches[0].id).eq("status", "ativo").maybeSingle();
              if (existing) {
                const { error } = await supabase.from("client_packages").update(patch as never).eq("id", existing.id);
                if (error) return { error: error.message };
                return { ok: true, updated: true, client: matches[0].name };
              }
              const size = (fields.size ?? "p10") as "p10" | "p20" | "p30" | "custom";
              const { error } = await supabase.from("client_packages").insert({
                workspace_id: workspaceId,
                client_id: matches[0].id,
                size,
                total_videos: fields.total_videos ?? (size === "p20" ? 20 : size === "p30" ? 30 : 10),
                price: fields.price ?? 0,
                price_per_video: fields.price_per_video ?? null,
              } as never);
              if (error) return { error: error.message };
              return { ok: true, created: true, client: matches[0].name };
            },
          }),
          list_whatsapp_conversations: tool({
            description: "Lista conversas da caixa de entrada de WhatsApp, com não lidas e prévia da última mensagem.",
            inputSchema: z.object({ search: z.string().nullable() }),
            execute: async ({ search }) => {
              let q = supabase.from("whatsapp_conversations")
                .select("id, wa_phone, contact_name, unread_count, last_message_at, last_message_preview, client_id")
                .eq("workspace_id", workspaceId)
                .order("last_message_at", { ascending: false, nullsFirst: false })
                .limit(30);
              if (search) q = q.ilike("contact_name", `%${search}%`);
              const { data, error } = await q;
              if (error) return { error: error.message };
              return { conversations: data ?? [] };
            },
          }),
          read_whatsapp_conversation: tool({
            description: "Lê as últimas mensagens de uma conversa de WhatsApp.",
            inputSchema: z.object({ conversation_id: z.string(), limit: z.number().int().nullable() }),
            execute: async ({ conversation_id, limit }) => {
              const { data, error } = await supabase.from("whatsapp_messages")
                .select("direction, body, sent_at, status")
                .eq("conversation_id", conversation_id)
                .order("sent_at", { ascending: false })
                .limit(limit ?? 20);
              if (error) return { error: error.message };
              return { messages: (data ?? []).reverse() };
            },
          }),
          send_whatsapp_message: tool({
            description: "Envia (ou registra, se o canal não estiver conectado) uma mensagem de WhatsApp para uma conversa existente ou para o número de um cliente.",
            inputSchema: z.object({
              conversation_id: z.string().nullable(),
              client_name: z.string().nullable(),
              phone: z.string().nullable(),
              body: z.string(),
            }),
            execute: async (input) => {
              let conversationId = input.conversation_id;
              let phone = input.phone ? input.phone.replace(/\D/g, "") : null;
              if (!conversationId && input.client_name) {
                const matches = await findClient(input.client_name);
                if (matches.length === 0) return { error: `Cliente "${input.client_name}" não encontrado.` };
                if (matches.length > 1) return { needs_clarification: true, candidates: matches };
                const { data: c } = await supabase.from("clients").select("whatsapp, phone").eq("id", matches[0].id).maybeSingle();
                phone = ((c?.whatsapp ?? c?.phone ?? "") as string).replace(/\D/g, "") || phone;
                const { data: conv } = await supabase.from("whatsapp_conversations").select("id").eq("workspace_id", workspaceId).eq("client_id", matches[0].id).maybeSingle();
                if (conv) conversationId = conv.id;
                else if (phone) {
                  const wa = phone.length <= 11 ? `55${phone}` : phone;
                  const { data: created, error } = await supabase.from("whatsapp_conversations").insert({
                    workspace_id: workspaceId, wa_phone: wa, contact_name: matches[0].name, client_id: matches[0].id,
                  }).select("id").single();
                  if (error) return { error: error.message };
                  conversationId = created.id;
                }
              }
              if (!conversationId) return { error: "Informe conversation_id ou um cliente com WhatsApp cadastrado." };

              const { data: conv } = await supabase.from("whatsapp_conversations").select("id, wa_phone").eq("id", conversationId).maybeSingle();
              if (!conv) return { error: "Conversa não encontrada." };

              const { data: channel } = await supabase.from("whatsapp_channels").select("phone_number_id, access_token, api_base, enabled").eq("workspace_id", workspaceId).maybeSingle();
              let status = "pendente";
              if (channel?.enabled && channel.access_token && channel.phone_number_id) {
                const base = channel.api_base || "https://graph.facebook.com/v21.0";
                const res = await fetch(`${base}/${channel.phone_number_id}/messages`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${channel.access_token}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ messaging_product: "whatsapp", to: conv.wa_phone, type: "text", text: { body: input.body } }),
                });
                status = res.ok ? "enviado" : "falhou";
              }
              const { error } = await supabase.from("whatsapp_messages").insert({
                workspace_id: workspaceId, conversation_id: conv.id, direction: "out", body: input.body, status, author_id: userId,
              });
              if (error) return { error: error.message };
              await supabase.from("whatsapp_conversations").update({
                last_message_at: new Date().toISOString(), last_message_preview: input.body.slice(0, 140),
              }).eq("id", conv.id);
              return { ok: true, status, note: status === "pendente" ? "Canal do WhatsApp não conectado — mensagem salva no histórico." : undefined };
            },
          }),
          log_time_entry: tool({
            description: "Registra tempo trabalhado (em minutos) em um vídeo ou tarefa.",
            inputSchema: z.object({
              minutes: z.number().int(),
              video_id: z.string().nullable(),
              task_id: z.string().nullable(),
              notes: z.string().nullable(),
            }),
            execute: async (input) => {
              const ended = new Date();
              const started = new Date(ended.getTime() - input.minutes * 60_000);
              const { error } = await supabase.from("time_entries").insert({
                workspace_id: workspaceId,
                user_id: userId,
                video_id: input.video_id,
                task_id: input.task_id,
                started_at: started.toISOString(),
                ended_at: ended.toISOString(),
                duration_seconds: input.minutes * 60,
                notes: input.notes,
              });
              if (error) return { error: error.message };
              return { ok: true, minutes: input.minutes };
            },
          }),
          financial_summary: tool({
            description: "Resumo financeiro: valor por cliente com base no preço por vídeo, produção da semana e pacotes ativos.",
            inputSchema: z.object({}),
            execute: async () => {
              const [{ data: clients }, { data: videos }, { data: packages }] = await Promise.all([
                supabase.from("clients").select("id, name, price_per_video").eq("workspace_id", workspaceId),
                supabase.from("videos").select("id, client_id, created_at, status").eq("workspace_id", workspaceId),
                supabase.from("client_packages").select("client_id, total_videos, videos_used, price, status").eq("workspace_id", workspaceId).eq("status", "ativo"),
              ]);
              const priceBy = Object.fromEntries((clients ?? []).map((c) => [c.id, Number(c.price_per_video ?? 0)]));
              const now = new Date();
              const day = (now.getDay() + 6) % 7;
              const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
              const week = (videos ?? []).filter((v) => new Date(v.created_at) >= start);
              return {
                week_videos: week.length,
                week_value: week.reduce((s, v) => s + (priceBy[v.client_id] ?? 0), 0),
                active_packages: (packages ?? []).map((p) => ({ ...p, remaining: p.total_videos - p.videos_used })),
              };
            },
          }),
          list_team: tool({
            description: "Lista membros do workspace com papel, para atribuir vídeos ou tarefas.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await supabase.from("workspace_members").select("user_id, role, profiles:user_id(full_name, email)").eq("workspace_id", workspaceId);
              if (error) return { error: error.message };
              return { members: data ?? [] };
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
        const system = `Você é o Copiloto do AlvasharFlow — sistema de gestão para creators, filmmakers e editores de vídeo. Data de hoje: ${today}. Usuário: ${profile?.full_name ?? "editor"} (papel: ${wsRole}).

Regras:
- Sempre confirme ações com o usuário APÓS executar, resumindo o que foi criado.
- Se faltar informação obrigatória (título, nome do cliente), pergunte antes de chamar a tool.
- Se o nome do cliente for ambíguo, use list_clients para desambiguar.
- Interprete "amanhã", "sexta", "próxima semana" em relação à data de hoje e converta para YYYY-MM-DD.
- Você pode executar praticamente tudo que existe no app: clientes (criar, editar, pausar), vídeos (criar, criar em leva, mover status, prazos, excluir), tarefas, leads do CRM, pacotes, registro de tempo, resumo financeiro, equipe e WhatsApp (listar, ler e responder conversas).
- Para EXCLUIR qualquer coisa, pergunte antes e só chame a tool com confirmed=true depois do "sim" explícito do usuário.
- Antes de atualizar algo, use a tool de listagem correspondente para achar o id certo; se houver mais de um candidato, pergunte qual.
- Se uma tool retornar needs_clarification, mostre as opções e peça para o usuário escolher.
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
