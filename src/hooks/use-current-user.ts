import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "client";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: AppRole;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async (): Promise<CurrentUser | null> => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const role: AppRole = roles?.some((r) => r.role === "admin") ? "admin" : "client";

      return {
        id: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        role,
      };
    },
    staleTime: 60_000,
  });
}
