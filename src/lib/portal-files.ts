import { supabase } from "@/integrations/supabase/client";
import { portalSignedUrl, portalUploadUrl } from "@/lib/portal-files.functions";

export const PORTAL_BUCKET = "portal-uploads";

/** Marca usada para arquivos guardados no storage do projeto. */
export function isStorageRef(url: string) {
  return url.startsWith("storage:");
}

/**
 * Gera um link temporário para abrir/tocar um arquivo do storage.
 * O token do portal é validado no servidor antes de assinar a URL.
 */
export async function resolveFileUrl(url: string, portalToken: string): Promise<string | null> {
  if (!isStorageRef(url)) return url;
  try {
    const res = await portalSignedUrl({ data: { token: portalToken, url } });
    return res.url;
  } catch {
    return null;
  }
}

export function isVideoFile(name: string, type?: string | null) {
  if (type?.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|m4v)$/i.test(name);
}

/** Envia um arquivo do cliente e devolve a referência para gravar no banco. */
export async function uploadPortalFile(file: File, portalToken: string, videoId: string) {
  const { path, token, storageRef } = await portalUploadUrl({
    data: { token: portalToken, videoId, fileName: file.name },
  });
  const { error } = await supabase.storage
    .from(PORTAL_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) throw error;
  return {
    url: storageRef,
    name: file.name,
    type: file.type || null,
    size: file.size,
  };
}

export function fmtBytes(bytes?: number | null) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
