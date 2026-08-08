import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MessageSquare, Clock, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

export type VideoComment = {
  id: string;
  video_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  timestamp_seconds: number | null;
  is_client: boolean;
  resolved: boolean;
  created_at: string;
};

export function parseTimestamp(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0]);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return null;
}

export function formatTimestamp(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${base}` : base;
}

export function useVideoComments(videoId?: string | null) {
  return useQuery({
    queryKey: ["video_comments", videoId],
    enabled: !!videoId,
    queryFn: async (): Promise<VideoComment[]> => {
      const { data, error } = await supabase
        .from("video_comments")
        .select("*")
        .eq("video_id", videoId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VideoComment[];
    },
  });
}

/**
 * Aprovação com comentários por marcação de tempo (estilo Frame.io).
 * Usado no painel do vídeo e no portal do cliente.
 */
export function VideoCommentsPanel({ videoId, workspaceId, authorName, asClient = false, clientToken }: {
  videoId: string;
  workspaceId: string;
  authorName: string;
  /** Quando true, o comentário é marcado como vindo do cliente. */
  asClient?: boolean;
  clientToken?: string;
}) {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const { data: comments, isLoading } = useVideoComments(videoId);
  const [body, setBody] = useState("");
  const [ts, setTs] = useState("");
  const [useTs, setUseTs] = useState(true);

  const add = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Escreva um comentário");
      if (asClient) {
        const { error } = await supabase.rpc("portal_add_comment", {
          _token: clientToken!,
          _video_id: videoId,
          _body: text,
          _timestamp: useTs ? parseTimestamp(ts) : null,
          _author_name: authorName || "Cliente",
        });
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("video_comments").insert({
        video_id: videoId,
        workspace_id: workspaceId,
        author_id: me?.id ?? null,
        author_name: authorName,
        body: text,
        timestamp_seconds: useTs ? parseTimestamp(ts) : null,
        is_client: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody(""); setTs("");
      sfx.success();
      qc.invalidateQueries({ queryKey: ["video_comments", videoId] });
    },
    onError: (e: Error) => { sfx.error(); toast.error(e.message); },
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase.from("video_comments").update({ resolved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_comments", videoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("video_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video_comments", videoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const open = (comments ?? []).filter((c) => !c.resolved);
  const resolved = (comments ?? []).filter((c) => c.resolved);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold">Comentários por tempo</p>
        {open.length > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">{open.length} em aberto</span>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-2">
        <div className="flex items-center gap-2">
          <Checkbox id={`ts-${videoId}`} checked={useTs} onCheckedChange={(v) => setUseTs(!!v)} />
          <label htmlFor={`ts-${videoId}`} className="text-[11px] text-muted-foreground">Marcar momento do vídeo</label>
          {useTs && (
            <Input
              value={ts}
              onChange={(e) => setTs(e.target.value)}
              placeholder="00:35"
              className="h-7 w-24 font-mono text-xs"
            />
          )}
        </div>
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ex: cortar a respiração antes da fala"
          className="text-xs"
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={add.isPending || !body.trim()} onClick={() => add.mutate()}>
            {add.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Comentar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
      ) : (comments ?? []).length === 0 ? (
        <p className="py-3 text-center text-[11px] text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-1.5">
          {[...open, ...resolved].map((c) => (
            <div
              key={c.id}
              className={cn(
                "group rounded-md border border-border px-2.5 py-2 text-xs transition",
                c.resolved && "opacity-55",
              )}
            >
              <div className="flex items-center gap-2">
                {c.timestamp_seconds !== null && (
                  <span className="flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                    <Clock className="h-2.5 w-2.5" />{formatTimestamp(c.timestamp_seconds)}
                  </span>
                )}
                <span className="font-medium">{c.author_name}</span>
                {c.is_client && <span className="rounded bg-muted px-1 text-[9px] uppercase tracking-wider text-muted-foreground">cliente</span>}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                {!asClient && (
                  <>
                    <button
                      onClick={() => toggleResolved.mutate({ id: c.id, resolved: !c.resolved })}
                      className={cn("rounded p-0.5 hover:bg-muted", c.resolved ? "text-[oklch(0.72_0.17_155)]" : "text-muted-foreground")}
                      title={c.resolved ? "Reabrir" : "Marcar como resolvido"}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove.mutate(c.id)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap leading-snug">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
