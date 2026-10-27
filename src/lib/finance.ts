import { suggestPerVideo } from "./pricing";

export type FinVideo = {
  id: string;
  client_id: string;
  package_id: string | null;
  competence_month: string;
  created_at: string;
  status: string;
  unit_price: number | string | null;
};
export type FinClient = { id: string; parent_client_id: string | null; price_per_video: number | string | null };
export type FinPackage = {
  id: string;
  client_id: string;
  status: string;
  price: number | string;
  price_per_video: number | string | null;
  total_videos: number;
  start_date: string;
  end_date: string | null;
};

/** Valor de um vídeo: preço próprio > pacote ativo do cliente/cliente-mãe > avulso do cliente. */
export function videoValue(v: FinVideo, packages: FinPackage[], clients: FinClient[]): number {
  const own = Number(v.unit_price ?? 0);
  if (own > 0) return own;
  const perClient = new Map<string, number>();
  for (const p of packages) if (p.status === "ativo" && !perClient.has(p.client_id)) perClient.set(p.client_id, suggestPerVideo(p.price_per_video, p.price, p.total_videos));
  const client = clients.find((c) => c.id === v.client_id);
  const fromPkg = perClient.get(v.client_id) || (client?.parent_client_id ? perClient.get(client.parent_client_id) : 0) || 0;
  if (fromPkg > 0) return fromPkg;
  return Number(client?.price_per_video ?? 0);
}

/** Valor previsto (todos os vídeos da competência) e já entregue no mês "YYYY-MM". */
export function monthFinance(videos: FinVideo[], month: string, packages: FinPackage[], clients: FinClient[]) {
  let forecast = 0, deliveredValue = 0, total = 0, delivered = 0, unpriced = 0;
  for (const v of videos) {
    if (v.competence_month.slice(0, 7) !== month) continue;
    const value = videoValue(v, packages, clients);
    total += 1;
    if (value <= 0) unpriced += 1;
    forecast += value;
    if (v.status === "entregue") { delivered += 1; deliveredValue += value; }
  }
  return { forecast, deliveredValue, pendingValue: forecast - deliveredValue, total, delivered, unpriced };
}

/**
 * Vídeos que consomem um pacote: os ligados a ele; vídeos antigos sem pacote contam
 * quando são do cliente (ou de uma marca dele) e foram criados durante a vigência.
 */
export function packageUsage(pkg: FinPackage, videos: FinVideo[], clients: FinClient[]) {
  const family = new Set([pkg.client_id, ...clients.filter((c) => c.parent_client_id === pkg.client_id).map((c) => c.id)]);
  const start = pkg.start_date.slice(0, 10);
  const end = pkg.end_date?.slice(0, 10) ?? null;
  const rows = videos.filter((v) => {
    if (v.package_id) return v.package_id === pkg.id;
    if (!family.has(v.client_id)) return false;
    const created = v.created_at.slice(0, 10);
    return created >= start && (!end || created <= end);
  });
  const delivered = rows.filter((v) => v.status === "entregue").length;
  const allocated = rows.length;
  const total = Math.max(0, pkg.total_videos);
  return {
    allocated,
    delivered,
    remaining: Math.max(0, total - delivered),
    exceeded: Math.max(0, allocated - total),
    percent: total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0,
  };
}
