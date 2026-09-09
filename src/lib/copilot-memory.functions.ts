import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RememberSchema = z.object({ content: z.string().min(1), kind: z.enum(["fact", "preference", "alias"]).default("fact") });
const ForgetSchema = z.object({ id: z.string().uuid() });

async function currentWorkspaceId(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("current_workspace_id").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.current_workspace_id) throw new Error("Workspace não encontrado");
  return data.current_workspace_id as string;
}

export const listCopilotMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("copilot_memory")
      .select("id, kind, content, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const rememberForCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RememberSchema.parse(input))
  .handler(async ({ context, data }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { data: inserted, error } = await context.supabase
      .from("copilot_memory")
      .insert({
        workspace_id: workspaceId,
        author_id: context.userId,
        kind: data.kind,
        content: data.content,
      })
      .select("id, kind, content, created_at")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const forgetCopilotMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ForgetSchema.parse(input))
  .handler(async ({ context, data }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("copilot_memory")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
