/** Domínio do CRM de leads (novos clientes em negociação). */

export type LeadStage =
  | "novo" | "conversa" | "proposta" | "follow_up" | "fechando" | "fechado" | "perdido";

export const LEAD_STAGES: { id: LeadStage; label: string }[] = [
  { id: "novo", label: "Novo contato" },
  { id: "conversa", label: "Em conversa" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "follow_up", label: "Aguardando follow-up" },
  { id: "fechando", label: "Fechando" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

export const LEAD_SOURCES = [
  { id: "indicacao", label: "Indicação" },
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "site", label: "Site" },
  { id: "outro", label: "Outro" },
] as const;

export const LEAD_ACTIVITY_KINDS = [
  { id: "mensagem", label: "Mensagem" },
  { id: "ligacao", label: "Ligação" },
  { id: "reuniao", label: "Reunião" },
  { id: "proposta", label: "Proposta" },
  { id: "nota", label: "Nota" },
] as const;

/** Dias sem contato a partir dos quais o lead é destacado no quadro. */
export const FOLLOW_UP_ALERT_DAYS = 5;

export type Lead = {
  id: string;
  workspace_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  estimated_value: number | string | null;
  stage: LeadStage;
  last_contact_at: string | null;
  next_follow_up: string | null;
  notes: string | null;
  converted_client_id: string | null;
  created_at: string;
};

function daysSince(day: string) {
  const d = new Date(`${day}T00:00:00`).getTime();
  return Math.floor((Date.now() - d) / 86_400_000);
}

/** Lead precisa de atenção: follow-up vencido ou muito tempo sem contato. */
export function isLeadOverdue(lead: Pick<Lead, "stage" | "next_follow_up" | "last_contact_at" | "created_at">) {
  if (lead.stage === "fechado" || lead.stage === "perdido") return false;
  if (lead.next_follow_up && daysSince(lead.next_follow_up) > 0) return true;
  const ref = lead.last_contact_at ?? lead.created_at.slice(0, 10);
  return daysSince(ref) >= FOLLOW_UP_ALERT_DAYS;
}
