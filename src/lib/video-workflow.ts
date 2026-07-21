import type { Database } from "@/integrations/supabase/types";

export type VideoStatus = Database["public"]["Enums"]["video_status"];
export type VideoPriority = Database["public"]["Enums"]["video_priority"];
export type PackageSize = Database["public"]["Enums"]["package_size"];
export type DeliveryMethod = Database["public"]["Enums"]["delivery_method"];
export type LibraryCategory = Database["public"]["Enums"]["library_category"];

export const VIDEO_STAGES: { id: VideoStatus; label: string; accent: string }[] = [
  { id: "recebido", label: "Recebido", accent: "oklch(0.68 0.05 260)" },
  { id: "briefing", label: "Briefing", accent: "oklch(0.72 0.14 260)" },
  { id: "organizacao", label: "Organização", accent: "oklch(0.72 0.15 220)" },
  { id: "fila", label: "Fila", accent: "oklch(0.72 0.16 200)" },
  { id: "editando", label: "Editando", accent: "oklch(0.72 0.19 235)" },
  { id: "revisao", label: "Revisão", accent: "oklch(0.72 0.18 180)" },
  { id: "aguardando_cliente", label: "Aguardando cliente", accent: "oklch(0.78 0.16 75)" },
  { id: "alteracoes", label: "Alterações", accent: "oklch(0.72 0.19 30)" },
  { id: "aprovado", label: "Aprovado", accent: "oklch(0.72 0.17 155)" },
  { id: "entregue", label: "Entregue", accent: "oklch(0.60 0.14 155)" },
];

export const STAGE_LABEL: Record<VideoStatus, string> = Object.fromEntries(
  VIDEO_STAGES.map((s) => [s.id, s.label]),
) as Record<VideoStatus, string>;

export const STAGE_ACCENT: Record<VideoStatus, string> = Object.fromEntries(
  VIDEO_STAGES.map((s) => [s.id, s.accent]),
) as Record<VideoStatus, string>;

export const PRIORITY_LABEL: Record<VideoPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const PRIORITY_COLOR: Record<VideoPriority, string> = {
  baixa: "text-muted-foreground",
  media: "text-primary",
  alta: "text-[oklch(0.78_0.16_75)]",
  urgente: "text-destructive",
};

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  drive: "Google Drive",
  dropbox: "Dropbox",
  wetransfer: "WeTransfer",
  upload_interno: "Upload interno",
};

export const PACKAGE_LABEL: Record<PackageSize, string> = {
  p10: "10 vídeos",
  p20: "20 vídeos",
  p30: "30 vídeos",
  custom: "Personalizado",
};

export const LIBRARY_LABEL: Record<LibraryCategory, string> = {
  bruto: "Bruto",
  exportado: "Exportado",
  logo: "Logo",
  fonte: "Fonte",
  musica: "Música",
  lut: "LUT",
  documento: "Documento",
};
