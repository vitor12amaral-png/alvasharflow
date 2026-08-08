import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export type Branding = {
  workspace_id: string;
  brand_name: string;
  brand_tagline: string | null;
  logo_url: string | null;
  logo_letter: string | null;
  theme: string;
  primary_color: string;
  accent_color: string | null;
  radius: string;
  whatsapp_number: string | null;
  drive_folder_url: string | null;
  package_alert_threshold: number;
  nps_enabled: boolean;
  portal_welcome: string | null;
};

export const DEFAULT_BRANDING: Omit<Branding, "workspace_id"> = {
  brand_name: "AlvasharFlow",
  brand_tagline: "Creators & editores",
  logo_url: null,
  logo_letter: "A",
  theme: "dark",
  primary_color: "#38b6ff",
  accent_color: null,
  radius: "0.75rem",
  whatsapp_number: null,
  drive_folder_url: null,
  package_alert_threshold: 2,
  nps_enabled: true,
  portal_welcome: null,
};

export const THEME_PRESETS: { id: string; label: string; theme: "dark" | "light"; primary: string }[] = [
  { id: "midnight", label: "Midnight", theme: "dark", primary: "#38b6ff" },
  { id: "ember", label: "Ember", theme: "dark", primary: "#ff7a45" },
  { id: "forest", label: "Forest", theme: "dark", primary: "#3ddc97" },
  { id: "violet", label: "Violet", theme: "dark", primary: "#a37bff" },
  { id: "paper", label: "Paper", theme: "light", primary: "#2563eb" },
  { id: "sand", label: "Sand", theme: "light", primary: "#c2410c" },
];

/** Aplica marca/tema no documento. Seguro para chamar várias vezes. */
export function applyBranding(b: Partial<Branding> | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = b?.primary_color || DEFAULT_BRANDING.primary_color;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--chart-1", primary);
  root.style.setProperty("--brand-accent", b?.accent_color || primary);
  root.style.setProperty("--radius", b?.radius || DEFAULT_BRANDING.radius);
  root.classList.toggle("theme-light", (b?.theme ?? "dark") === "light");
}

export function useBranding() {
  const { data: me } = useCurrentUser();
  const workspaceId = me?.workspaceId ?? null;

  const query = useQuery({
    queryKey: ["workspace-settings", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<Branding> => {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return { workspace_id: workspaceId!, ...DEFAULT_BRANDING, ...(data ?? {}) } as Branding;
    },
  });

  useEffect(() => {
    if (query.data) applyBranding(query.data);
  }, [query.data]);

  return query;
}

export function useSaveBranding() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Branding>) => {
      if (!me?.workspaceId) throw new Error("Workspace não encontrado");
      const { error } = await supabase
        .from("workspace_settings")
        .upsert({ workspace_id: me.workspaceId, ...patch }, { onConflict: "workspace_id" });
      if (error) throw error;
      return patch;
    },
    onSuccess: (patch) => {
      applyBranding({ ...(qc.getQueryData(["workspace-settings", me?.workspaceId]) as Branding | undefined), ...patch });
      qc.invalidateQueries({ queryKey: ["workspace-settings"] });
    },
  });
}
