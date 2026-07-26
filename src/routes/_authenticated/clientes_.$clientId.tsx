import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Instagram, Phone, Mail, ExternalLink, Loader2, Palette, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { initials, formatBRL, formatDate, relativeTime } from "@/lib/format";
import { STAGE_LABEL, STAGE_ACCENT, DELIVERY_LABEL, LIBRARY_LABEL, PACKAGE_LABEL, PRIORITY_LABEL } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority, PackageSize, DeliveryMethod, LibraryCategory } from "@/lib/video-workflow";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/clientes_/$clientId")({
  component: ClientDetail,
  head: () => ({ meta: [{ title: "Cliente — alves.edt" }] }),
});

function ClientDetail() {
  const { clientId } = Route.useParams();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const [c, packs, vids, lib, acts] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
        supabase.from("client_packages").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("videos").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("client_library").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("activity_log").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(30),
      ]);
      if (c.error) throw c.error;
      return {
        client: c.data,
        packages: packs.data ?? [],
        videos: vids.data ?? [],
        library: lib.data ?? [],
        activity: acts.data ?? [],
      };
    },
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!client?.client) return <div className="p-8 text-center text-muted-foreground">Cliente não encontrado</div>;

  const c = client.client;
  const activePack = client.packages.find((p) => p.status === "ativo");

  return (
    <div className="p-6 md:p-8">
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" />Todos os clientes
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 font-display text-xl font-bold text-primary">
          {initials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{c.name}</h1>
          {c.company && <p className="text-sm text-muted-foreground">{c.company}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            {c.whatsapp && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.whatsapp}</span>}
            {c.instagram && <span className="inline-flex items-center gap-1"><Instagram className="h-3 w-3" />{c.instagram}</span>}
          </div>
        </div>
        {activePack && (
          <Card className="p-4 min-w-[220px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pacote ativo</p>
            <p className="font-display text-lg font-semibold">{PACKAGE_LABEL[activePack.size as PackageSize]}</p>
            <p className="text-xs text-muted-foreground">
              {activePack.videos_used}/{activePack.total_videos} usados · {formatBRL(activePack.price)}
            </p>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="demands">Vídeos ({client.videos.length})</TabsTrigger>
          <TabsTrigger value="library">Biblioteca ({client.library.length})</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-3 md:grid-cols-3">
          <Card className="p-4"><Stat label="Vídeos totais" value={String(client.videos.length)} /></Card>
          <Card className="p-4"><Stat label="Em produção" value={String(client.videos.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length)} /></Card>
          <Card className="p-4"><Stat label="Entregues" value={String(client.videos.filter((v) => v.status === "entregue").length)} /></Card>
          {c.delivery_link && (
            <Card className="p-4 md:col-span-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entrega</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{DELIVERY_LABEL[c.delivery_method as DeliveryMethod] ?? "—"}</Badge>
                <a href={c.delivery_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  {c.delivery_link} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>
          )}
          {c.notes && (
            <Card className="p-4 md:col-span-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.notes}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="demands" className="mt-4">
          <div className="mb-3 flex justify-end">
            <NewVideoDialog clientId={clientId} packageId={activePack?.id ?? null} nextPosition={client.videos.length} />
          </div>
          {client.videos.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum vídeo ainda.</Card>
          ) : (
            <div className="space-y-2">
              {client.videos.map((v) => (
                <Card key={v.id} className="flex items-center gap-3 p-3">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_ACCENT[v.status as VideoStatus] }} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{v.title}</p>
                    <p className="text-[11px] text-muted-foreground">{STAGE_LABEL[v.status as VideoStatus]} · {PRIORITY_LABEL[v.priority as VideoPriority]}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(v.due_date)}</span>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          {client.library.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Biblioteca vazia.</Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {client.library.map((f) => (
                <Card key={f.id} className="p-3">
                  <Badge variant="outline" className="text-[10px]">{LIBRARY_LABEL[f.category as LibraryCategory]}</Badge>
                  <p className="mt-1 truncate text-sm font-medium">{f.name}</p>
                  <a href={f.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="briefing" className="mt-4 space-y-3">
          {c.logo_url && (
            <Card className="p-4"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Logo</p><img src={c.logo_url} alt="Logo" className="max-h-24" /></Card>
          )}
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cores da marca</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {((c.brand_colors as string[]) ?? []).length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma</span> :
                ((c.brand_colors as string[]) ?? []).map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: color }} />
                    <span className="text-xs">{color}</span>
                  </div>
                ))
              }
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fontes</p>
            <p className="mt-1 text-sm">{((c.brand_fonts as string[]) ?? []).join(", ") || "—"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Referências</p>
            <div className="mt-1 space-y-1">
              {((c.brand_references as string[]) ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma</p> :
                ((c.brand_references as string[]) ?? []).map((r, i) => (
                  <a key={i} href={r} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{r}</a>
                ))
              }
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          {client.packages.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Sem pacotes.</Card>
          ) : (
            <div className="space-y-2">
              {client.packages.map((p) => (
                <Card key={p.id} className="flex items-center gap-4 p-4">
                  <Palette className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{PACKAGE_LABEL[p.size as PackageSize]}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(p.start_date)} — {formatDate(p.end_date)} · Dia de pagamento: {p.payment_day ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-semibold">{formatBRL(p.price)}</p>
                    <Badge variant={p.status === "ativo" ? "default" : "outline"} className="text-[10px]">{p.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {client.activity.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Sem movimentações.</Card>
          ) : (
            <Card className="p-4">
              <ol className="relative space-y-3 border-l border-border pl-4">
                {client.activity.map((a) => (
                  <li key={a.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm">{describeActivity(a.entity_type, a.action, a.metadata as Record<string, unknown>)}</p>
                    <p className="text-[11px] text-muted-foreground">{relativeTime(a.created_at)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function describeActivity(entity: string, action: string, meta: Record<string, unknown>): string {
  const title = (meta.title as string) ?? (meta.name as string) ?? "";
  if (entity === "video" && action === "created") return `Novo vídeo: ${title}`;
  if (entity === "video" && action === "status_changed") return `${title} → ${STAGE_LABEL[meta.to as VideoStatus] ?? meta.to}`;
  if (entity === "video" && action === "assigned") return `Editor atribuído a ${title}`;
  if (entity === "client" && action === "created") return `Cliente cadastrado: ${title}`;
  if (entity === "package" && action === "created") return `Pacote criado: ${meta.total_videos} vídeos`;
  return `${entity} · ${action}`;
}

function NewVideoDialog({ clientId, packageId, nextPosition }: { clientId: string; packageId: string | null; nextPosition: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<VideoPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: me } = useCurrentUser();

  async function submit() {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    if (!me?.workspaceId) { toast.error("Workspace não encontrado"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("videos").insert({
        workspace_id: me.workspaceId,
        client_id: clientId,
        package_id: packageId,
        title: title.trim(),
        priority,
        status: "recebido",
        due_date: dueDate || null,
        position: nextPosition,
      });
      if (error) throw error;
      toast.success("Vídeo criado");
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setTitle(""); setDueDate(""); setPriority("media");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo vídeo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo vídeo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Ex: Reels lançamento" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as VideoPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
