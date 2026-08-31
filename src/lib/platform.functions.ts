import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Donos da plataforma (não do workspace) que podem administrar contas. */
const PLATFORM_OWNER_IDS = ["dbfc3bfe-ad71-4f59-8f0e-14c6327bb4bf"];

function assertPlatformOwner(userId: string) {
  if (!PLATFORM_OWNER_IDS.includes(userId)) throw new Error("Acesso restrito");
}

export type PlatformAccount = {
  workspace_id: string;
  name: string;
  plan: "trial" | "active" | "suspended";
  trial_ends_at: string;
  owner_email: string | null;
  members: number;
  clients: number;
  videos: number;
  active: boolean;
};

/** Lista todas as contas da plataforma com plano, validade e volume de dados. */
export const listPlatformAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformAccount[]> => {
    assertPlatformOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: workspaces }, { data: profiles }, { data: members }, { data: clients }, { data: videos }] =
      await Promise.all([
        supabaseAdmin.from("workspaces").select("id, name, plan, trial_ends_at, owner_id").order("created_at"),
        supabaseAdmin.from("profiles").select("id, email"),
        supabaseAdmin.from("workspace_members").select("workspace_id"),
        supabaseAdmin.from("clients").select("workspace_id"),
        supabaseAdmin.from("videos").select("workspace_id"),
      ]);

    const count = (rows: { workspace_id: string }[] | null, id: string) =>
      (rows ?? []).filter((r) => r.workspace_id === id).length;

    return (workspaces ?? []).map((w) => ({
      workspace_id: w.id,
      name: w.name,
      plan: w.plan as PlatformAccount["plan"],
      trial_ends_at: w.trial_ends_at,
      owner_email: (profiles ?? []).find((p) => p.id === w.owner_id)?.email ?? null,
      members: count(members as any, w.id),
      clients: count(clients as any, w.id),
      videos: count(videos as any, w.id),
      active: w.plan === "active" || (w.plan === "trial" && new Date(w.trial_ends_at) > new Date()),
    }));
  });

/** Ativa, suspende ou estende o teste de uma conta. */
export const setAccountPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workspace_id: string; action: "activate" | "suspend" | "extend"; days?: number }) => {
    if (!input?.workspace_id) throw new Error("workspace_id obrigatório");
    if (!["activate", "suspend", "extend"].includes(input.action)) throw new Error("ação inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    assertPlatformOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> =
      data.action === "activate"
        ? { plan: "active" }
        : data.action === "suspend"
          ? { plan: "suspended" }
          : {
              plan: "trial",
              trial_ends_at: new Date(Date.now() + Math.min(Math.max(data.days ?? 30, 1), 365) * 86_400_000).toISOString(),
            };

    const { error } = await supabaseAdmin.from("workspaces").update(patch).eq("id", data.workspace_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Indica se o usuário logado pode ver o painel de contas. */
export const amIPlatformOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ owner: PLATFORM_OWNER_IDS.includes(context.userId) }));
