import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "editor" | "client";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: AppRole;
  workspaceId: string | null;
  workspaceRole: "owner" | "admin" | "editor" | null;
  trialEndsAt: string | null;
  plan: "trial" | "active" | "suspended" | null;
  isActive: boolean;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async (): Promise<CurrentUser | null> => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }, { data: memberships }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, email, current_workspace_id").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("workspace_members").select("workspace_id, role, workspaces(id, plan, trial_ends_at)").eq("user_id", user.id),
      ]);

      const rs = (roles ?? []).map((r) => r.role);
      const role: AppRole = rs.includes("admin") ? "admin" : rs.includes("editor") ? "editor" : "client";

      const mems = memberships ?? [];
      const preferred = mems.find((m: any) => m.workspace_id === profile?.current_workspace_id) ?? mems[0];
      const ws: any = preferred?.workspaces ?? null;
      const plan = ws?.plan ?? null;
      const trialEndsAt = ws?.trial_ends_at ?? null;
      const isActive = plan === "active" || (plan === "trial" && trialEndsAt && new Date(trialEndsAt) > new Date());

      return {
        id: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        role,
        workspaceId: preferred?.workspace_id ?? null,
        workspaceRole: (preferred?.role as any) ?? null,
        trialEndsAt,
        plan,
        isActive: Boolean(isActive),
      };
    },
    staleTime: 60_000,
  });
}
