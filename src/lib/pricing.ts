import { supabase } from "@/integrations/supabase/client";

export type PricingInfo = {
  packageId: string | null;
  pricePerVideo: number;
  source: "pacote" | "avulso" | "indefinido";
  clientName: string;
};

/** Resolve quanto vale cada vídeo de um cliente: pacote ativo > valor avulso do cliente. */
export async function resolveClientPricing(clientId: string): Promise<PricingInfo> {
  const [{ data: pkg }, { data: client }] = await Promise.all([
    supabase
      .from("client_packages")
      .select("id, price, total_videos, price_per_video")
      .eq("client_id", clientId)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("clients").select("name, price_per_video, parent_client_id").eq("id", clientId).maybeSingle(),
  ]);

  let packageId = pkg?.id ?? null;
  let perVideo = suggestPerVideo(pkg?.price_per_video, pkg?.price, pkg?.total_videos);

  // Sub-cliente: usa o pacote do cliente-mãe
  if (!packageId && client?.parent_client_id) {
    const { data: parentPkg } = await supabase
      .from("client_packages")
      .select("id, price, total_videos, price_per_video")
      .eq("client_id", client.parent_client_id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (parentPkg) {
      packageId = parentPkg.id;
      perVideo = suggestPerVideo(parentPkg.price_per_video, parentPkg.price, parentPkg.total_videos);
    }
  }

  if (perVideo > 0) {
    return { packageId, pricePerVideo: perVideo, source: "pacote", clientName: client?.name ?? "" };
  }
  const avulso = Number(client?.price_per_video ?? 0);
  if (avulso > 0) {
    return { packageId, pricePerVideo: avulso, source: "avulso", clientName: client?.name ?? "" };
  }
  return { packageId, pricePerVideo: 0, source: "indefinido", clientName: client?.name ?? "" };
}

export function suggestPerVideo(
  explicit: number | string | null | undefined,
  price: number | string | null | undefined,
  totalVideos: number | null | undefined,
): number {
  const e = Number(explicit ?? 0);
  if (e > 0) return e;
  const p = Number(price ?? 0);
  const t = Number(totalVideos ?? 0);
  if (p > 0 && t > 0) return Math.round((p / t) * 100) / 100;
  return 0;
}
