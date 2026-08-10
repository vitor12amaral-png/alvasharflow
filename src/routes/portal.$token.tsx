import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2, CheckCircle2, MessageSquare, Star, CalendarClock, Upload, Paperclip,
  Clock, PlayCircle, ExternalLink,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { applyBranding } from "@/hooks/use-branding";
import { toast } from "sonner";
import { STAGE_LABEL, STAGE_ACCENT } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { formatDate } from "@/lib/format";
import { resolveFileUrl, uploadPortalFile, isVideoFile, fmtBytes } from "@/lib/portal-files";

export const Route = createFileRoute("/portal/$token")({
  component: PortalPage,
  head: () => ({
    meta: [
      { title: "Portal do cliente — AlvasharFlow" },
      { name: "description", content: "Acompanhe, aprove, comente e envie arquivos dos seus vídeos em produção." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PortalPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();

  const ctx = useQuery({
    queryKey: ["portal-ctx", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_resolve_token", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const branding = useQuery({
    queryKey: ["portal-branding", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_branding", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  useEffect(() => {
    if (branding.data) applyBranding(branding.data as any);
  }, [branding.data]);

  const vids = useQuery({
    queryKey: ["portal-videos", token],
    enabled: !!ctx.data,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_list_videos", { _token: token });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["portal-videos", token] });

  if (ctx.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!ctx.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Peça um novo link ao seu editor.</p>
        </Card>
      </div>
    );
  }

  const client = ctx.data as any;
  const list = vids.data ?? [];
  const deliveredWithoutFeedback = list.find((v) => v.status === "entregue");
  const brand = branding.data as any;

  const emAndamento = list.filter((v) => !["aprovado", "entregue"].includes(v.status)).length;
  const aguardando = list.filter((v) => v.status === "aguardando_cliente" || v.status === "revisao").length;
  const prontos = list.length - emAndamento;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        {brand?.logo_url ? (
          <img src={brand.logo_url} alt={`Logo ${brand.brand_name}`} className="h-11 w-11 rounded-xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 font-display font-bold text-primary">
            {(brand?.brand_name ?? "A").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Portal do cliente {brand?.brand_name ? `· ${brand.brand_name}` : ""}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-semibold">{client.client_name}</h1>
          {client.client_company && <p className="text-sm text-muted-foreground">{client.client_company}</p>}
        </div>
      </header>

      {brand?.portal_welcome && (
        <Card className="mb-4 p-4 text-sm text-muted-foreground">{brand.portal_welcome}</Card>
      )}

      {list.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <MiniStat label="Em produção" value={emAndamento} />
          <MiniStat label="Aguardando você" value={aguardando} accent />
          <MiniStat label="Concluídos" value={prontos} />
        </div>
      )}

      {deliveredWithoutFeedback && (
        <NpsPrompt token={token} videoId={deliveredWithoutFeedback.id} title={deliveredWithoutFeedback.title} />
      )}

      {vids.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum vídeo em andamento.</Card>
      ) : (
        <div className="space-y-3">
          {list.map((v) => (
            <VideoCard
              key={v.id}
              token={token}
              video={v}
              onChange={invalidate}
              clientName={client.client_name}
              clientId={client.client_id}
            />
          ))}
        </div>
      )}

      <footer className="mt-10 text-center text-[10px] text-muted-foreground">
        Feito com {brand?.brand_name ?? "AlvasharFlow"}
      </footer>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function statusLabelForClient(s: VideoStatus): string {
  if (["recebido", "briefing", "organizacao", "fila", "editando"].includes(s)) return "Em produção";
  if (s === "revisao" || s === "alteracoes") return "Em revisão";
  if (s === "aguardando_cliente") return "Aguardando você";
  if (s === "aprovado") return "Aprovado";
  if (s === "entregue") return "Entregue";
  return STAGE_LABEL[s] ?? s;
}

function fmtStamp(sec: number | null | undefined) {
  if (sec === null || sec === undefined || sec < 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${base}` : base;
}

function VideoCard({ token, video, onChange, clientName, clientId }: {
  token: string; video: any; onChange: () => void; clientName: string; clientId: string;
}) {
  const qc = useQueryClient();
  const [approveOpen, setApproveOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [due, setDue] = useState<string>(video.due_date ?? "");
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const s = video.status as VideoStatus;
  const canAct = s === "aguardando_cliente" || s === "revisao";
  const isApproved = s === "aprovado" || s === "entregue";

  const files = useQuery({
    queryKey: ["portal-files", token, video.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_list_files", { _token: token, _video_id: video.id });
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Fonte do player: último arquivo de vídeo enviado, ou o link final direto. */
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromFiles = (files.data ?? []).find((f: any) => isVideoFile(f.name, f.file_type));
      const raw = fromFiles?.url ?? (video.final_file_link && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(video.final_file_link) ? video.final_file_link : null);
      if (!raw) { if (!cancelled) setSrc(null); return; }
      const url = await resolveFileUrl(raw);
      if (!cancelled) setSrc(url);
    })();
    return () => { cancelled = true; };
  }, [files.data, video.final_file_link]);

  const seek = useCallback((sec: number) => {
    const el = playerRef.current;
    if (!el) return;
    el.currentTime = sec;
    el.play().catch(() => {});
  }, []);

  async function approve() {
    setSaving(true);
    const { error } = await supabase.rpc("portal_approve_video", { _token: token, _video_id: video.id, _comment: comment });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Vídeo aprovado. Obrigado!");
    setApproveOpen(false); setComment("");
    onChange();
  }
  async function requestChanges() {
    if (!comment.trim()) return toast.error("Descreva o ajuste desejado");
    setSaving(true);
    const { error } = await supabase.rpc("portal_request_changes", { _token: token, _video_id: video.id, _comment: comment });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado");
    setChangesOpen(false); setComment("");
    onChange();
  }
  async function saveDue(value: string) {
    setDue(value);
    const { error } = await supabase.rpc("portal_set_due_date", {
      _token: token, _video_id: video.id, _due: value || (null as any),
    });
    if (error) return toast.error(error.message);
    toast.success("Prazo atualizado");
    onChange();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) return toast.error("Arquivo muito grande (máx. 500 MB)");
    setSaving(true);
    try {
      const up = await uploadPortalFile(file, clientId, video.id);
      const { error } = await supabase.rpc("portal_add_file", {
        _token: token, _video_id: video.id, _name: up.name, _url: up.url,
        _file_type: up.type ?? "", _size: up.size,
      });
      if (error) throw error;
      toast.success("Arquivo enviado");
      qc.invalidateQueries({ queryKey: ["portal-files", token, video.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Falha no envio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden p-4 transition lift hover:lift-hover">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_ACCENT[s] }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{video.title}</p>
          {video.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{video.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={isApproved ? "default" : "secondary"} className="text-[10px]">{statusLabelForClient(s)}</Badge>
            <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <input
                type="date"
                value={due}
                onChange={(e) => saveDue(e.target.value)}
                className="rounded-md border border-border bg-transparent px-1.5 py-0.5 text-[11px]"
                aria-label="Prazo do vídeo"
              />
            </label>
            {video.due_date && <span className="text-[10px] text-muted-foreground">Atual: {formatDate(video.due_date)}</span>}
          </div>
        </div>
        {canAct && (
          <div className="flex w-full gap-2 md:w-auto">
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 md:flex-none"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Aprovar vídeo</DialogTitle></DialogHeader>
                <Label>Comentário (opcional)</Label>
                <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancelar</Button>
                  <Button onClick={approve} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 md:flex-none"><MessageSquare className="mr-1 h-3.5 w-3.5" />Ajuste</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Solicitar ajuste</DialogTitle></DialogHeader>
                <Label>Descreva o que precisa ser ajustado</Label>
                <Textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ex: cortar de 00:12 a 00:15, aumentar volume da trilha…" />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setChangesOpen(false)}>Cancelar</Button>
                  <Button onClick={requestChanges} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Enviar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {src && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black/40">
          <video ref={playerRef} src={src} controls playsInline className="aspect-video w-full" />
        </div>
      )}

      {video.final_file_link && (
        <a
          href={video.final_file_link}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />Abrir arquivo final
        </a>
      )}

      <PortalFiles files={files.data ?? []} loading={files.isLoading} onUpload={onUpload} busy={saving} />

      <PortalComments
        token={token}
        videoId={video.id}
        author={clientName}
        onSeek={src ? seek : undefined}
        currentTime={() => Math.floor(playerRef.current?.currentTime ?? 0)}
      />
    </Card>
  );
}

function PortalFiles({ files, loading, onUpload, busy }: {
  files: any[]; loading: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; busy: boolean;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold">Arquivos</p>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] transition hover:border-primary/50 hover:text-primary">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Enviar arquivo
          <input type="file" className="hidden" onChange={onUpload} disabled={busy} />
        </label>
      </div>
      {loading ? (
        <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />
      ) : files.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Nenhum arquivo ainda. Envie brutos, referências ou trilhas.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <FileRow key={f.id} file={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({ file }: { file: any }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    const url = await resolveFileUrl(file.url);
    setBusy(false);
    if (!url) return toast.error("Não foi possível abrir o arquivo");
    window.open(url, "_blank", "noopener");
  }
  return (
    <li className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] transition hover:bg-muted/50">
      {isVideoFile(file.name, file.file_type)
        ? <PlayCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
        : <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate">{file.name}</span>
      <span className="text-muted-foreground">{fmtBytes(file.size_bytes)}</span>
      <button onClick={open} className="rounded p-0.5 text-muted-foreground hover:text-primary" title="Abrir">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
      </button>
    </li>
  );
}

/** Comentários com marcação de tempo (estilo Frame.io), lado do cliente. */
function PortalComments({ token, videoId, author, onSeek, currentTime }: {
  token: string; videoId: string; author: string;
  onSeek?: (sec: number) => void;
  currentTime: () => number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stamp, setStamp] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const list = useQuery({
    queryKey: ["portal-comments", token, videoId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_list_comments", { _token: token, _video_id: videoId });
      if (error) throw error;
      return data ?? [];
    },
  });

  function parseStamp(input: string): number | null {
    const t = input.trim();
    if (!t) return null;
    const parts = t.split(":").map((n) => Number(n));
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 1) return parts[0]!;
    if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
    if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    return null;
  }

  async function send() {
    if (!body.trim()) return toast.error("Escreva um comentário");
    setSaving(true);
    const { error } = await supabase.rpc("portal_add_comment", {
      _token: token,
      _video_id: videoId,
      _seconds: (parseStamp(stamp) ?? -1) as unknown as number,
      _body: body,
      _author: author,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setBody(""); setStamp("");
    toast.success("Comentário enviado");
    qc.invalidateQueries({ queryKey: ["portal-comments", token, videoId] });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {open ? "Ocultar comentários" : "Comentários e marcações"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {list.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (list.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
          ) : (
            <ul className="space-y-2">
              {(list.data ?? []).map((c: any) => {
                const sec = c.timestamp_seconds === null ? null : Number(c.timestamp_seconds);
                const label = fmtStamp(sec);
                return (
                  <li key={c.id} className="rounded-md border border-border px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      {label && (
                        <button
                          onClick={() => onSeek?.(sec!)}
                          disabled={!onSeek}
                          className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary transition hover:bg-primary/25 disabled:opacity-60"
                          title={onSeek ? "Ir para este momento" : undefined}
                        >
                          <Clock className="h-2.5 w-2.5" />{label}
                        </button>
                      )}
                      <span className="font-medium">{c.author_name}</span>
                      {c.resolved && <Badge variant="outline" className="text-[9px]">resolvido</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-start gap-2">
            <input
              value={stamp}
              onChange={(e) => setStamp(e.target.value)}
              placeholder="00:12"
              aria-label="Marcação de tempo"
              className="w-20 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
            />
            {onSeek && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                onClick={() => setStamp(fmtStamp(currentTime()) ?? "")}
                title="Usar o tempo atual do player"
              >
                <Clock className="mr-1 h-3.5 w-3.5" />Tempo atual
              </Button>
            )}
            <Textarea
              rows={2}
              className="min-w-[200px] flex-1 text-xs"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ex: ajustar corte aqui"
            />
            <Button size="sm" onClick={send} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NpsPrompt({ token, videoId, title }: { token: string; videoId: string; title: string }) {
  const key = useMemo(() => `alvesedt-nps-${token}-${videoId}`, [token, videoId]);
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && localStorage.getItem(key) === "1");
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  if (dismissed) return null;

  async function submit() {
    if (nps === null) return toast.error("Escolha uma nota");
    setSaving(true);
    const { error } = await supabase.rpc("portal_submit_feedback", { _token: token, _video_id: videoId, _nps: nps, _comment: comment });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Obrigado pelo feedback!");
    localStorage.setItem(key, "1");
    setDismissed(true);
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex items-start gap-2">
        <Star className="mt-0.5 h-4 w-4 text-[oklch(0.78_0.16_75)]" />
        <div className="flex-1">
          <p className="text-sm font-medium">Como foi sua experiência com "{title}"?</p>
          <p className="text-xs text-muted-foreground">De 0 a 10, quanto você recomendaria o trabalho?</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {Array.from({ length: 11 }).map((_, n) => (
              <button
                key={n}
                onClick={() => setNps(n)}
                className={`h-8 w-8 rounded-md border text-xs transition ${nps === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <Textarea className="mt-3" rows={2} placeholder="Comentário (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Enviar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { localStorage.setItem(key, "1"); setDismissed(true); }}>Agora não</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
