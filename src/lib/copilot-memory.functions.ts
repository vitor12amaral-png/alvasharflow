import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RememberSchema = z.object({ content: z.string().min(1), kind: z.enum(["fact", "preference", "alias"]).default("fact") });
const ForgetSchema = z.object({ id: z.string().uuid() });

export const listCopilotMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("copilot_memory")
      .select("id, kind, content, created_at, updated_at")
      .eq("workspace_id", context.workspaceId ?? "")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const rememberForCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RememberSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!context.workspaceId) throw new Error("Workspace não encontrado");
    const { data: inserted, error } = await context.supabase
      .from("copilot_memory")
      .insert({
        workspace_id: context.workspaceId,
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
    const { error } = await context.supabase
      .from("copilot_memory")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", context.workspaceId ?? "");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
