import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const PORTAL_BUCKET = "portal-uploads";

const tokenSchema = z.string().min(10).max(200);

/** Resolve o token do portal para o client_id, no servidor (nunca confia no cliente). */
async function resolveClientId(token: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("portal_resolve_token", { _token: token });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as { client_id?: string } | null)?.client_id ?? null;
}

function pathOf(url: string) {
  return url.replace(`storage:${PORTAL_BUCKET}/`, "").replace("storage:", "");
}

/** Gera URL assinada de leitura apenas para arquivos do cliente dono do token. */
export const portalSignedUrl = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ token: tokenSchema, url: z.string().min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const clientId = await resolveClientId(data.token);
    if (!clientId) throw new Error("Link do portal inválido ou expirado");

    const path = pathOf(data.url);
    if (path.split("/")[0] !== clientId) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(PORTAL_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) throw new Error("Não foi possível abrir o arquivo");
    return { url: signed.signedUrl };
  });

/** Gera URL assinada de upload dentro da pasta do cliente dono do token. */
export const portalUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: tokenSchema,
        videoId: z.string().uuid(),
        fileName: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const clientId = await resolveClientId(data.token);
    if (!clientId) throw new Error("Link do portal inválido ou expirado");

    const safe = data.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
    const path = `${clientId}/${data.videoId}/${Date.now()}-${safe}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(PORTAL_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error("Não foi possível iniciar o envio");
    return { path, token: signed.token, storageRef: `storage:${PORTAL_BUCKET}/${path}` };
  });
