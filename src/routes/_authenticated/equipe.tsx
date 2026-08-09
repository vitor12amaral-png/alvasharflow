import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Link2, Copy, Trash2, UserPlus, ChevronRight, Users } from "lucide-react";
import { initials } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useVideoPace, fmtEstimate } from "@/hooks/use-timer";
import { STAGE_LABEL, STAGE_ACCENT } from "@/lib/video-workflow";
import type { VideoStatus } from "@/lib/video-workflow";
import { DueDatePopover, DueBadge } from "@/components/due-date-popover";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipe")({
  component: EquipePage,
  head: () => ({
    meta: [
      { title: "Equipe — AlvasharFlow" },
      { name: "description", content: "Convide editores por link e gerencie as demandas de cada um em um só lugar." },
      { property: "og:title", content: "Equipe — AlvasharFlow" },
      { property: "og:description", content: "Convide editores por link e gerencie as demandas de cada um." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ALL_STATUSES = Object.keys(STAGE_LABEL) as VideoStatus[];
const DONE: VideoStatus[] = ["aprovado", "entregue"];

type VideoRow = {
  id: string;
  title: string;
  status: VideoStatus;
  editor_id: string | null;
  due_date: string | null;
  due_time: string | null;
  clients: { name: string } | null;
};

function token() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function EquipePage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [openMember, setOpenMember] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team", me?.workspaceId],
    enabled: !!me?.workspaceId,
    queryFn: async () => {
      const [{ data: members }, { data: profiles }, { data: videos }, { data: invites }] = await Promise.all([
        supabase.from("workspace_members").select("user_id, role, joined_at").eq("workspace_id", me!.workspaceId!),
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
        supabase.from("videos").select("id, title, status, editor_id, due_date, due_time, clients(name)"),
        supabase.from("workspace_invites").select("id, email, role, token, expires_at, accepted_at").eq("workspace_id", me!.workspaceId!).order("created_at", { ascending: false }),
      ]);
      return {
        members: members ?? [],
        profiles: profiles ?? [],
        videos: (videos ?? []) as unknown as VideoRow[],
        invites: invites ?? [],
      };
    },
  });

  const { data: pace } = useVideoPace();
  const avg = pace?.avgPerVideo ?? 0;

  const assign = useMutation({
    mutationFn: async ({ ids, editor_id }: { ids: string[]; editor_id: string | null }) => {
      const { error } = await supabase.from("videos").update({ editor_id }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      sfx.success();
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
    },
    onError: (e: Error) => { sfx.error(); toast.error(e.message); },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VideoStatus }) => {
      const { error } = await supabase.from("videos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      sfx.success();
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["videos-workflow"] });
    },
    onError: (e: Error) => { sfx.error(); toast.error(e.message); },
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); toast.success("Convite removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const profileOf = (id: string) => data.profiles.find((p) => p.id === id);
  const members = data.members.map((m) => {
    const p = profileOf(m.user_id);
    const vids = data.videos.filter((v) => v.editor_id === m.user_id);
    return {
      id: m.user_id,
      role: m.role as string,
      name: p?.full_name ?? p?.email ?? "Membro",
      email: p?.email ?? "",
      avatar: p?.avatar_url ?? null,
      videos: vids,
      ativos: vids.filter((v) => !DONE.includes(v.status)).length,
      entregues: vids.filter((v) => v.status === "entregue").length,
    };
  });

  const unassigned = data.videos.filter((v) => !v.editor_id && !DONE.includes(v.status));
  const pendingInvites = data.invites.filter((i) => !i.accepted_at);
  const selected = members.find((m) => m.id === openMember) ?? null;
  const canManage = me?.workspaceRole === "owner" || me?.workspaceRole === "admin";

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Equipe"
        subtitle={`${members.length} ${members.length === 1 ? "membro" : "membros"} · ${unassigned.length} demanda(s) sem responsável`}
        actions={
          canManage ? (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-1 h-4 w-4" />Convidar editor</Button>
              </DialogTrigger>
              <InviteDialog workspaceId={me!.workspaceId!} userId={me!.id} onClose={() => setInviteOpen(false)} />
            </Dialog>
          ) : undefined
        }
      />

      {pendingInvites.length > 0 && (
        <Card className="mt-6 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Convites pendentes</p>
          <div className="space-y-2">
            {pendingInvites.map((i) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${i.token}`;
              return (
                <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{i.email}</span>
                  <Badge variant="outline" className="text-[9px] uppercase">{i.role}</Badge>
                  <span className="text-muted-foreground">expira {new Date(i.expires_at).toLocaleDateString("pt-BR")}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => { navigator.clipboard.writeText(url); sfx.success(); toast.success("Link copiado"); }}
                    >
                      <Copy className="mr-1 h-3 w-3" />Copiar link
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => revokeInvite.mutate(i.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <EditorMetricsPanel />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <Card
            key={m.id}
            onClick={() => { setOpenMember(m.id === openMember ? null : m.id); sfx.select(); }}
            className={cn(
              "cursor-pointer p-5 transition hover:border-primary/50",
              openMember === m.id && "border-primary/60",
            )}
          >
            <div className="flex items-center gap-3">
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 font-display font-semibold text-primary">
                  {initials(m.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold">{m.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                <Badge variant={m.role === "owner" ? "default" : "outline"} className="mt-1 text-[9px] uppercase">{m.role}</Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
              <Stat label="Ativos" value={String(m.ativos)} accent="text-primary" />
              <Stat label="Entregues" value={String(m.entregues)} accent="text-[oklch(0.72_0.17_155)]" />
              <Stat label="Carga" value={avg > 0 ? fmtEstimate(avg * m.ativos) : "—"} accent="text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-semibold">Demandas de {selected.name}</p>
            <span className="text-xs text-muted-foreground">
              {selected.ativos} em aberto{avg > 0 ? ` · ≈ ${fmtEstimate(avg * selected.ativos)} de trabalho` : ""}
            </span>
          </div>

          <div className="mt-3 divide-y divide-border/60 rounded-md border border-border">
            {selected.videos.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma demanda atribuída ainda.</p>
            ) : (
              selected.videos.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: STAGE_ACCENT[v.status] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{v.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{v.clients?.name ?? "—"}</p>
                  </div>
                  <StatusPicker current={v.status} onPick={(s) => setStatus.mutate({ id: v.id, status: s })} />
                  <DueDatePopover table="videos" ids={[v.id]} due={v.due_date} time={v.due_time} align="end" invalidate={[["team"], ["videos-workflow"]]}>
                    <button aria-label="Prazo"><DueBadge due={v.due_date} time={v.due_time} /></button>
                  </DueDatePopover>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => assign.mutate({ ids: [v.id], editor_id: null })}>
                    Remover
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="font-display text-sm font-semibold">Demandas sem responsável ({unassigned.length})</p>
        </div>
        <div className="mt-3 divide-y divide-border/60 rounded-md border border-border">
          {unassigned.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Tudo distribuído.</p>
          ) : (
            unassigned.slice(0, 30).map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="h-2 w-2 rounded-full" style={{ background: STAGE_ACCENT[v.status] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{v.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{v.clients?.name ?? "—"} · {STAGE_LABEL[v.status]}</p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]">Atribuir</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => assign.mutate({ ids: [v.id], editor_id: m.id })}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[9px] text-primary">{initials(m.name)}</span>
                        {m.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function StatusPicker({ current, onPick }: { current: VideoStatus; onPick: (s: VideoStatus) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground">
          {STAGE_LABEL[current]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted", s === current && "bg-muted")}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_ACCENT[s] }} />
            {STAGE_LABEL[s]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function InviteDialog({ workspaceId, userId, onClose }: { workspaceId: string; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const [link, setLink] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const t = token();
      const expires = new Date();
      expires.setDate(expires.getDate() + 14);
      const { error } = await supabase.from("workspace_invites").insert({
        workspace_id: workspaceId,
        email: email.trim().toLowerCase(),
        role,
        token: t,
        invited_by: userId,
        expires_at: expires.toISOString(),
      });
      if (error) throw error;
      return `${window.location.origin}/convite/${t}`;
    },
    onSuccess: (url) => {
      setLink(url);
      navigator.clipboard.writeText(url).catch(() => {});
      sfx.success();
      toast.success("Convite criado e link copiado");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => { sfx.error(); toast.error(e.message); },
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Convidar para a equipe</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>E-mail do editor</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="editor@email.com" type="email" />
        </div>
        <div className="space-y-1.5">
          <Label>Permissão</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "editor" | "admin")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor — edita as demandas atribuídas</SelectItem>
              <SelectItem value="admin">Admin — gerencia tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {link && (
          <div className="rounded-md border border-border bg-muted/40 p-2 text-[11px] break-all">
            {link}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button disabled={!email.trim() || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}
          Gerar link
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className={`font-display text-lg font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
