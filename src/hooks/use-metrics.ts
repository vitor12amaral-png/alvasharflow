import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export type EditorMetric = {
  userId: string;
  name: string;
  /** Vídeos entregues ou aprovados no período. */
  done: number;
  /** Vídeos ainda em aberto atribuídos ao editor. */
  open: number;
  /** Atrasados (prazo vencido e não concluídos). */
  late: number;
  /** Segundos totais registrados no período. */
  trackedSeconds: number;
  /** Média de segundos por vídeo concluído (só conta vídeos com tempo). */
  avgSecondsPerVideo: number;
  /** Vídeos concluídos por semana no período. */
  throughputPerWeek: number;
  /** Sessões de cronômetro no período. */
  sessions: number;
};

/**
 * Métricas comparativas por editor: entrega, tempo médio e throughput.
 * `days` define a janela de análise.
 */
export function useEditorMetrics(days = 30) {
  const { data: me } = useCurrentUser();
  const workspaceId = me?.workspaceId ?? null;

  return useQuery({
    queryKey: ["editor-metrics", workspaceId, days],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<EditorMetric[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
      const sinceIso = since.toISOString();

      const [members, videos, entries, profiles] = await Promise.all([
        supabase.from("workspace_members").select("user_id, role").eq("workspace_id", workspaceId!),
        supabase.from("videos")
          .select("id, editor_id, status, due_date, updated_at")
          .eq("workspace_id", workspaceId!),
        supabase.from("time_entries")
          .select("user_id, video_id, duration_seconds, started_at")
          .eq("workspace_id", workspaceId!)
          .gte("started_at", sinceIso)
          .not("duration_seconds", "is", null),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      const nameOf = new Map<string, string>();
      (profiles.data ?? []).forEach((p) => nameOf.set(p.id, p.full_name || p.email || "Sem nome"));

      const today = new Date().toISOString().slice(0, 10);
      const weeks = Math.max(1, days / 7);

      const result: EditorMetric[] = (members.data ?? []).map((m) => {
        const mine = (videos.data ?? []).filter((v) => v.editor_id === m.user_id);
        const done = mine.filter(
          (v) => (v.status === "entregue" || v.status === "aprovado") && v.updated_at >= sinceIso,
        );
        const open = mine.filter((v) => v.status !== "entregue" && v.status !== "aprovado");
        const late = open.filter((v) => v.due_date && v.due_date < today);

        const myEntries = (entries.data ?? []).filter((e) => e.user_id === m.user_id);
        const trackedSeconds = myEntries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);

        const perVideo = new Map<string, number>();
        myEntries.forEach((e) => {
          if (!e.video_id) return;
          perVideo.set(e.video_id, (perVideo.get(e.video_id) ?? 0) + (e.duration_seconds ?? 0));
        });
        const doneIds = new Set(done.map((v) => v.id));
        const timedDone = Array.from(perVideo.entries()).filter(([id]) => doneIds.has(id));
        const avgBase = timedDone.length ? timedDone : Array.from(perVideo.entries());
        const avgSecondsPerVideo = avgBase.length
          ? Math.round(avgBase.reduce((s, [, v]) => s + v, 0) / avgBase.length)
          : 0;

        return {
          userId: m.user_id,
          name: nameOf.get(m.user_id) ?? "Editor",
          done: done.length,
          open: open.length,
          late: late.length,
          trackedSeconds,
          avgSecondsPerVideo,
          throughputPerWeek: Math.round((done.length / weeks) * 10) / 10,
          sessions: myEntries.length,
        };
      });

      return result.sort((a, b) => b.done - a.done || b.trackedSeconds - a.trackedSeconds);
    },
  });
}

export type PackageAlert = {
  clientId: string;
  clientName: string;
  packageId: string;
  total: number;
  used: number;
  remaining: number;
  endDate: string | null;
};

/** Pacotes de clientes prestes a acabar (ou já estourados). */
export function usePackageAlerts(threshold = 2) {
  const { data: me } = useCurrentUser();
  const workspaceId = me?.workspaceId ?? null;

  return useQuery({
    queryKey: ["package-alerts", workspaceId, threshold],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<PackageAlert[]> => {
      const { data, error } = await supabase
        .from("client_packages")
        .select("id, client_id, total_videos, videos_used, end_date, status, clients(name)")
        .eq("workspace_id", workspaceId!)
        .eq("status", "ativo");
      if (error) throw error;
      return (data ?? [])
        .map((p: any) => ({
          clientId: p.client_id,
          clientName: p.clients?.name ?? "Cliente",
          packageId: p.id,
          total: p.total_videos ?? 0,
          used: p.videos_used ?? 0,
          remaining: (p.total_videos ?? 0) - (p.videos_used ?? 0),
          endDate: p.end_date ?? null,
        }))
        .filter((p) => p.remaining <= threshold)
        .sort((a, b) => a.remaining - b.remaining);
    },
  });
}
