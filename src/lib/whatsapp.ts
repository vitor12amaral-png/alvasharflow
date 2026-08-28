/** Domínio da caixa de entrada de WhatsApp. */

export type WaConversation = {
  id: string;
  workspace_id: string;
  wa_phone: string;
  contact_name: string | null;
  client_id: string | null;
  lead_id: string | null;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
};

export type WaMessage = {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string;
  sent_at: string;
};

/** Só dígitos, com DDI 55 assumido para números brasileiros sem código de país. */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

/** Exibição amigável: +55 (11) 91234-5678 quando possível. */
export function formatPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const end = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `+55 (${ddd}) ${mid}-${end}`;
  }
  return `+${d}`;
}
