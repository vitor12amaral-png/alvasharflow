import { supabase } from "@/integrations/supabase/client";

export const PORTAL_BUCKET = "portal-uploads";

/** Marca usada para arquivos guardados no storage do projeto. */
export function isStorageRef(url: string) {
  return url.startsWith("storage:");
}

function pathOf(url: string) {
  return url.replace(`storage:${PORTAL_BUCKET}/`, "").replace("storage:", "");
}

/** Gera um link temporário para abrir/tocar um arquivo do storage. */
export async function resolveFileUrl(url: string, expiresIn = 60 * 60): Promise<string | null> {
  if (!isStorageRef(url)) return url;
  const { data, error } = await supabase.storage.from(PORTAL_BUCKET).createSignedUrl(pathOf(url), expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export function isVideoFile(name: string, type?: string | null) {
  if (type?.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|m4v)$/i.test(name);
}

/** Envia um arquivo do cliente e devolve a referência para gravar no banco. */
export async function uploadPortalFile(file: File, clientId: string, videoId: string) {
  const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
  const path = `${clientId}/${videoId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(PORTAL_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return {
    url: `storage:${PORTAL_BUCKET}/${path}`,
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
