import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";
import { initials } from "@/lib/format";
import type { VideoStatus } from "@/lib/video-workflow";

export const Route = createFileRoute("/_authenticated/equipe")({
  component: EquipePage,
  head: () => ({ meta: [{ title: "Equipe — AlvasharFlow" }] }),
});

function EquipePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }, { data: videos }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
        supabase.from("videos").select("id, status, editor_id"),
      ]);
      return { roles: roles ?? [], profiles: profiles ?? [], videos: videos ?? [] };
    },
  });

  if (isLoading || !data) return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const members = data.profiles.map((p) => {
    const rs = data.roles.filter((r) => r.user_id === p.id).map((r) => r.role);
    const videos = data.videos.filter((v) => v.editor_id === p.id);
    const ativos = videos.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length;
    const entregues = videos.filter((v) => v.status === "entregue").length;
    return { ...p, roles: rs, ativos, entregues, total: videos.length };
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Equipe" subtitle={`${members.length} ${members.length === 1 ? "membro" : "membros"}`} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex items-center gap-3">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.full_name ?? ""} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 font-display font-semibold text-primary">
                  {initials(m.full_name ?? m.email)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold">{m.full_name ?? "—"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                <div className="mt-1 flex gap-1">
                  {m.roles.includes("admin") && <Badge className="text-[9px]">Admin</Badge>}
                  {m.roles.includes("editor") && <Badge variant="outline" className="text-[9px]">Editor</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
              <Stat label="Ativos" value={m.ativos} accent="text-primary" />
              <Stat label="Entregues" value={m.entregues} accent="text-[oklch(0.72_0.17_155)]" />
              <Stat label="Total" value={m.total} accent="text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-4 text-xs text-muted-foreground">
        Para adicionar novos membros à equipe, peça para cadastrarem na tela de login. Eles entram como <b className="text-foreground">editor</b> automaticamente.
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <p className={`font-display text-xl font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
