import type { VideoStatus } from "@/lib/video-workflow";

export type BatchVideo = {
  id: string;
  client_id: string;
  competence_month: string;
  batch_id: string | null;
  batch_label: string | null;
  status: VideoStatus;
  clients: { name: string } | null;
};

export function groupVideoBatches<T extends BatchVideo>(videos: T[], month: string) {
  const groups = new Map<string, { key: string; clientName: string; label: string; rows: T[]; delivered: number; approved: number }>();
  for (const video of videos) {
    if (video.competence_month.slice(0, 7) !== month) continue;
    const key = `${video.client_id}::${video.batch_id ?? "unbatched"}`;
    const group = groups.get(key) ?? {
      key, clientName: video.clients?.name ?? "Cliente",
      label: video.batch_id ? video.batch_label?.trim() || "Leva sem nome" : "Vídeos avulsos",
      rows: [], delivered: 0, approved: 0,
    };
    group.rows.push(video);
    if (video.status === "entregue") group.delivered++;
    if (video.status === "aprovado") group.approved++;
    groups.set(key, group);
  }
  return Array.from(groups.values());
}