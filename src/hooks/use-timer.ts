import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { sfx } from "@/lib/sfx";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "alvesedt-active-timer";
const EVT = "alvashar-timer";

export type ActiveTimer = {
  entryId: string;
  /** Início do segmento atual (ISO). */
  startedAt: string;
  /** Segundos já acumulados em segmentos anteriores (antes das pausas). */
  accumulated: number;
  /** Quando pausado, guarda o instante da pausa. */
  pausedAt: string | null;
  label: string;
  videoId?: string | null;
  taskId?: string | null;
  /** Vários vídeos (leva em conjunto) sendo cronometrados juntos. */
  batchIds?: string[] | null;
  /** Marcações de volta (segundos acumulados no momento de cada "vídeo pronto"). */
  laps?: number[] | null;
  notes?: string | null;
};


function read(): ActiveTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s) as ActiveTimer;
    return { ...parsed, accumulated: parsed.accumulated ?? 0, pausedAt: parsed.pausedAt ?? null };
  } catch {
    return null;
  }
}
function write(v: ActiveTimer | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

function computeElapsed(t: ActiveTimer, now: number) {
  if (t.pausedAt) return Math.max(0, Math.round(t.accumulated));
  return Math.max(0, Math.round(t.accumulated + (now - new Date(t.startedAt).getTime()) / 1000));
}

export function useTimer() {
  const [active, setActive] = useState<ActiveTimer | null>(() => read());
  const [now, setNow] = useState(() => Date.now());
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();

  useEffect(() => {
    if (!active || active.pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Sincroniza entre abas e entre componentes da mesma aba.
  useEffect(() => {
    const sync = () => setActive(read());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, sync);
    };
  }, []);

  const stop = useCallback(async () => {
    const cur = read();
    if (!cur) return;
    const duration = Math.max(1, computeElapsed(cur, Date.now()));
    const { error } = await supabase.from("time_entries").update({
      ended_at: new Date().toISOString(),
      duration_seconds: duration,
      notes: cur.notes ?? null,
    }).eq("id", cur.entryId);
    if (error) { toast.error(error.message); sfx.error(); return; }
    write(null); setActive(null);
    qc.invalidateQueries({ queryKey: ["time_entries"] });
    sfx.stop();
    toast.success(`Sessão registrada: ${fmt(duration)}`);
  }, [qc]);

  const start = useCallback(async (opts: {
    videoId?: string; taskId?: string; label: string; notes?: string; batchIds?: string[];
  }) => {
    if (!me?.workspaceId) { toast.error("Sem workspace"); return; }
    const cur = read();
    if (cur) {
      if (!confirm(`Já existe um cronômetro rodando (${cur.label}). Finalizar o atual e iniciar novo?`)) return;
      await stop();
    }
    const { data, error } = await supabase.from("time_entries").insert({
      workspace_id: me.workspaceId,
      user_id: me.id,
      video_id: opts.videoId ?? null,
      task_id: opts.taskId ?? null,
      notes: opts.notes ?? null,
    }).select("id, started_at").single();
    if (error) { toast.error(error.message); return; }
    const t: ActiveTimer = {
      entryId: data.id, startedAt: data.started_at, accumulated: 0, pausedAt: null,
      label: opts.label, videoId: opts.videoId, taskId: opts.taskId,
      batchIds: opts.batchIds ?? null, notes: opts.notes ?? null,
    };
    write(t); setActive(t);
    sfx.start();
    toast.success("Cronômetro iniciado");
  }, [me, stop]);

  /** Pausa: banca o tempo do segmento atual. */
  const pause = useCallback(() => {
    const cur = read();
    if (!cur || cur.pausedAt) return;
    const next: ActiveTimer = {
      ...cur,
      accumulated: computeElapsed(cur, Date.now()),
      pausedAt: new Date().toISOString(),
    };
    write(next); setActive(next);
    sfx.pause();
  }, []);

  /** Retoma a contagem a partir de agora. */
  const resume = useCallback(() => {
    const cur = read();
    if (!cur || !cur.pausedAt) return;
    const next: ActiveTimer = { ...cur, startedAt: new Date().toISOString(), pausedAt: null };
    write(next); setActive(next);
    setNow(Date.now());
    sfx.start();
  }, []);

  const toggle = useCallback(() => {
    const cur = read();
    if (!cur) return;
    if (cur.pausedAt) resume(); else pause();
  }, [pause, resume]);

  /** Descarta a sessão em andamento sem registrar tempo. */
  const discard = useCallback(async () => {
    const cur = read();
    if (!cur) return;
    const { error } = await supabase.from("time_entries").delete().eq("id", cur.entryId);
    if (error) { toast.error(error.message); return; }
    write(null); setActive(null);
    qc.invalidateQueries({ queryKey: ["time_entries"] });
    toast.success("Sessão descartada");
  }, [qc]);

  /** Atualiza a anotação da sessão em andamento (salva ao finalizar). */
  const setNotes = useCallback((notes: string) => {
    const cur = read();
    if (!cur) return;
    const next = { ...cur, notes };
    write(next);
    setActive(next);
  }, []);

  const elapsed = active ? computeElapsed(active, now) : 0;
  const paused = !!active?.pausedAt;

  return { active, elapsed, paused, start, stop, pause, resume, toggle, discard, setNotes };
}

/** Total de tempo registrado hoje (e na semana) pelo usuário atual. */
export function useTimeSummary() {
  const { data: me } = useCurrentUser();
  return useQuery({
    queryKey: ["time_entries", "summary", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("time_entries")
        .select("duration_seconds, started_at, video_id, task_id")
        .eq("user_id", me!.id)
        .gte("started_at", since.toISOString())
        .not("duration_seconds", "is", null);
      if (error) throw error;
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      let today = 0, week = 0, sessions = 0;
      (data ?? []).forEach((e) => {
        const d = e.duration_seconds ?? 0;
        week += d; sessions++;
        if (new Date(e.started_at) >= startOfToday) today += d;
      });
      return { today, week, sessions };
    },
  });
}

/** Tempo total já registrado em um vídeo específico. */
export function useVideoTime(videoId?: string | null) {
  return useQuery({
    queryKey: ["time_entries", "video", videoId],
    enabled: !!videoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .eq("video_id", videoId!);
      if (error) throw error;
      return (data ?? []).reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
    },
  });
}

export function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Relógio completo hh:mm:ss — usado no cronômetro grande. */
export function fmtClock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Ritmo de produção do workspace: quanto tempo, em média, leva um vídeo.
 * Calculado sobre sessões finalizadas agrupadas por vídeo.
 */
export function useVideoPace(videoIds?: string[]) {
  const key = (videoIds ?? []).slice().sort().join(",");
  return useQuery({
    queryKey: ["time_entries", "pace", key],
    queryFn: async () => {
      let q = supabase
        .from("time_entries")
        .select("video_id, duration_seconds")
        .not("video_id", "is", null)
        .not("duration_seconds", "is", null);
      if (videoIds && videoIds.length > 0 && videoIds.length <= 200) q = q.in("video_id", videoIds);
      const { data, error } = await q;
      if (error) throw error;
      const perVideo = new Map<string, number>();
      (data ?? []).forEach((e) => {
        if (!e.video_id) return;
        perVideo.set(e.video_id, (perVideo.get(e.video_id) ?? 0) + (e.duration_seconds ?? 0));
      });
      const totals = Array.from(perVideo.values());
      const tracked = totals.reduce((s, v) => s + v, 0);
      const avg = totals.length ? Math.round(tracked / totals.length) : 0;
      return { avgPerVideo: avg, trackedVideos: totals.length, trackedSeconds: tracked };
    },
  });
}

/** Formata uma estimativa em horas/minutos ("≈ 4h20"). */
export function fmtEstimate(seconds: number) {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
