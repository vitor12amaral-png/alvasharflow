import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "alvesedt-active-timer";

export type ActiveTimer = {
  entryId: string;
  startedAt: string; // ISO
  label: string;
  videoId?: string | null;
  taskId?: string | null;
};

function read(): ActiveTimer | null {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function write(v: ActiveTimer | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  else localStorage.removeItem(STORAGE_KEY);
}

export function useTimer() {
  const [active, setActive] = useState<ActiveTimer | null>(() => read());
  const [now, setNow] = useState(() => Date.now());
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setActive(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const start = useCallback(async (opts: { videoId?: string; taskId?: string; label: string; notes?: string }) => {
    if (!me?.workspaceId) { toast.error("Sem workspace"); return; }
    if (active) {
      if (!confirm(`Já existe um cronômetro rodando (${active.label}). Finalizar o atual e iniciar novo?`)) return;
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
    const t: ActiveTimer = { entryId: data.id, startedAt: data.started_at, label: opts.label, videoId: opts.videoId, taskId: opts.taskId };
    write(t); setActive(t);
    toast.success("Cronômetro iniciado");
  }, [active, me]);

  const stop = useCallback(async () => {
    const cur = read();
    if (!cur) return;
    const ended = new Date();
    const duration = Math.max(1, Math.floor((ended.getTime() - new Date(cur.startedAt).getTime()) / 1000));
    const { error } = await supabase.from("time_entries").update({
      ended_at: ended.toISOString(),
      duration_seconds: duration,
    }).eq("id", cur.entryId);
    if (error) { toast.error(error.message); return; }
    write(null); setActive(null);
    qc.invalidateQueries({ queryKey: ["time_entries"] });
    toast.success(`Sessão registrada: ${fmt(duration)}`);
  }, [qc]);

  const elapsed = active ? Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000)) : 0;

  return { active, elapsed, start, stop };
}

export function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
