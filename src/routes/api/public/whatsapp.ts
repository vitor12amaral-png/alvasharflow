import { createFileRoute } from "@tanstack/react-router";
import { normalizePhone } from "@/lib/whatsapp";

/**
 * Webhook do WhatsApp (Meta Cloud API).
 * GET  -> verificação do webhook (hub.challenge)
 * POST -> mensagens recebidas, gravadas na caixa de entrada do workspace do canal.
 */
export const Route = createFileRoute("/api/public/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode !== "subscribe" || !token) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("whatsapp_channels")
          .select("workspace_id")
          .eq("verify_token", token)
          .maybeSingle();
        if (!data) return new Response("Forbidden", { status: 403 });
        return new Response(challenge ?? "", { status: 200 });
      },

      POST: async ({ request }) => {
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const entry of payload?.entry ?? []) {
          for (const change of entry?.changes ?? []) {
            const value = change?.value;
            const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
            const messages: any[] = value?.messages ?? [];
            if (!phoneNumberId || messages.length === 0) continue;

            const { data: channel } = await supabaseAdmin
              .from("whatsapp_channels")
              .select("workspace_id")
              .eq("phone_number_id", phoneNumberId)
              .maybeSingle();
            if (!channel) continue;
            const workspaceId = channel.workspace_id;

            const contactName: string | null = value?.contacts?.[0]?.profile?.name ?? null;

            for (const msg of messages) {
              const from = normalizePhone(String(msg?.from ?? ""));
              if (!from) continue;

              const body: string | null =
                msg?.text?.body ??
                msg?.button?.text ??
                msg?.interactive?.list_reply?.title ??
                msg?.interactive?.button_reply?.title ??
                null;
              const mediaType: string | null = msg?.type && msg.type !== "text" ? String(msg.type) : null;

              const { data: existing } = await supabaseAdmin
                .from("whatsapp_conversations")
                .select("id, unread_count, client_id")
                .eq("workspace_id", workspaceId)
                .eq("wa_phone", from)
                .maybeSingle();

              let conversationId = existing?.id ?? null;

              if (!conversationId) {
                // Vincula automaticamente ao cliente ou lead com o mesmo telefone.
                const { data: clients } = await supabaseAdmin
                  .from("clients")
                  .select("id, whatsapp, phone")
                  .eq("workspace_id", workspaceId);
                const client = (clients ?? []).find(
                  (c) => normalizePhone(c.whatsapp ?? "") === from || normalizePhone(c.phone ?? "") === from,
                );
                const { data: leads } = await supabaseAdmin
                  .from("leads")
                  .select("id, phone")
                  .eq("workspace_id", workspaceId);
                const lead = (leads ?? []).find((l) => normalizePhone(l.phone ?? "") === from);

                const { data: created } = await supabaseAdmin
                  .from("whatsapp_conversations")
                  .insert({
                    workspace_id: workspaceId,
                    wa_phone: from,
                    contact_name: contactName,
                    client_id: client?.id ?? null,
                    lead_id: lead?.id ?? null,
                  })
                  .select("id")
                  .single();
                conversationId = created?.id ?? null;
              }

              if (!conversationId) continue;

              await supabaseAdmin.from("whatsapp_messages").insert({
                workspace_id: workspaceId,
                conversation_id: conversationId,
                direction: "in",
                body,
                media_type: mediaType,
                status: "recebido",
                provider_message_id: msg?.id ?? null,
                sent_at: msg?.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
              });

              await supabaseAdmin
                .from("whatsapp_conversations")
                .update({
                  contact_name: contactName ?? undefined,
                  unread_count: (existing?.unread_count ?? 0) + 1,
                  last_message_at: new Date().toISOString(),
                  last_message_preview: (body ?? `[${mediaType ?? "mídia"}]`).slice(0, 140),
                  status: "aberta",
                })
                .eq("id", conversationId);
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});
