import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizePhone } from "@/lib/whatsapp";

const sendSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

/**
 * Envia uma mensagem de WhatsApp pela conversa e registra no histórico.
 * Se o canal ainda não estiver conectado a um provedor, a mensagem é salva
 * como rascunho pendente (status "pendente") para não perder o histórico.
 */
export const sendWhatsappMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conv, error: convErr } = await supabase
      .from("whatsapp_conversations")
      .select("id, workspace_id, wa_phone")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (convErr || !conv) throw new Error("Conversa não encontrada");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: channel } = await supabaseAdmin
      .from("whatsapp_channels")
      .select("provider, phone_number_id, access_token, api_base, enabled")
      .eq("workspace_id", conv.workspace_id)
      .maybeSingle();

    let status = "pendente";
    let providerId: string | null = null;
    let warning: string | null = null;

    if (channel?.enabled && channel.access_token && channel.phone_number_id) {
      const base = channel.api_base || "https://graph.facebook.com/v21.0";
      try {
        const res = await fetch(`${base}/${channel.phone_number_id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${channel.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: normalizePhone(conv.wa_phone),
            type: "text",
            text: { preview_url: true, body: data.body },
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          messages?: { id: string }[];
          error?: { message?: string };
        };
        if (res.ok) {
          status = "enviado";
          providerId = json.messages?.[0]?.id ?? null;
        } else {
          status = "falhou";
          warning = json.error?.message ?? `Falha do provedor (${res.status})`;
        }
      } catch (e) {
        status = "falhou";
        warning = (e as Error).message;
      }
    } else {
      warning = "Canal do WhatsApp ainda não conectado — mensagem salva no histórico.";
    }

    const { data: msg, error: msgErr } = await supabase
      .from("whatsapp_messages")
      .insert({
        workspace_id: conv.workspace_id,
        conversation_id: conv.id,
        direction: "out",
        body: data.body,
        status,
        provider_message_id: providerId,
        author_id: userId,
      })
      .select("id, body, status, sent_at, direction")
      .single();
    if (msgErr) throw new Error(msgErr.message);

    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: data.body.slice(0, 140),
      })
      .eq("id", conv.id);

    return { message: msg, status, warning };
  });
