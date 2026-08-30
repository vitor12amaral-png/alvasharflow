import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone } from "@/lib/whatsapp";

/** Tipos de aviso que podem ser enviados por WhatsApp. */
export const ALERT_KINDS = {
  prazo_vencendo: "on_due_soon",
  video_aprovado: "on_video_approved",
  video_entregue: "on_video_delivered",
  pacote_limite: "on_package_limit",
  tarefa_urgente: "on_urgent_task",
} as const;

export type AlertKind = keyof typeof ALERT_KINDS;

/**
 * Gera avisos de prazo e dispara por WhatsApp as notificações pendentes
 * do usuário logado, respeitando as preferências dele.
 * Sem canal conectado, apenas retorna quantos avisos ficaram aguardando.
 */
export const dispatchMyWhatsappAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prefs } = await supabase
      .from("whatsapp_alert_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!prefs || !prefs.enabled || !prefs.phone) return { sent: 0, pending: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Prazos vencendo hoje/amanhã viram notificação (uma vez por vídeo por dia).
    if (prefs.on_due_soon) {
      const today = new Date();
      const limit = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: videos } = await supabase
        .from("videos")
        .select("id, title, client_id, workspace_id, due_date, status")
        .lte("due_date", limit)
        .not("due_date", "is", null)
        .not("status", "in", "(aprovado,entregue)")
        .limit(40);

      for (const v of videos ?? []) {
        const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
        const { count } = await supabaseAdmin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("video_id", v.id)
          .eq("user_id", userId)
          .eq("kind", "prazo_vencendo")
          .gte("created_at", since);
        if ((count ?? 0) > 0) continue;
        await supabaseAdmin.from("notifications").insert({
          workspace_id: v.workspace_id,
          user_id: userId,
          kind: "prazo_vencendo",
          title: "Prazo vencendo",
          body: v.title,
          link: "/workflow",
          video_id: v.id,
          client_id: v.client_id,
        });
      }
    }

    // 2) Quais tipos este usuário aceita receber.
    const kinds = (Object.keys(ALERT_KINDS) as AlertKind[]).filter(
      (k) => prefs[ALERT_KINDS[k]] === true,
    );
    if (kinds.length === 0) return { sent: 0, pending: 0 };

    const { data: pending } = await supabase
      .from("notifications")
      .select("id, workspace_id, kind, title, body")
      .eq("user_id", userId)
      .is("whatsapp_sent_at", null)
      .in("kind", kinds)
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(15);

    if (!pending?.length) return { sent: 0, pending: 0 };

    const { data: channel } = await supabaseAdmin
      .from("whatsapp_channels")
      .select("phone_number_id, access_token, api_base, enabled")
      .eq("workspace_id", pending[0]!.workspace_id)
      .maybeSingle();

    if (!channel?.enabled || !channel.access_token || !channel.phone_number_id) {
      return { sent: 0, pending: pending.length };
    }

    const base = channel.api_base || "https://graph.facebook.com/v21.0";
    let sent = 0;

    for (const n of pending) {
      const text = `*${n.title}*\n${n.body ?? ""}`.trim();
      try {
        const res = await fetch(`${base}/${channel.phone_number_id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${channel.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: normalizePhone(prefs.phone),
            type: "text",
            text: { preview_url: false, body: text },
          }),
        });
        if (!res.ok) continue;
        sent += 1;
        await supabaseAdmin
          .from("notifications")
          .update({ whatsapp_sent_at: new Date().toISOString() })
          .eq("id", n.id);
      } catch {
        // Falha de rede: tenta de novo no próximo ciclo.
      }
    }

    return { sent, pending: pending.length - sent };
  });
