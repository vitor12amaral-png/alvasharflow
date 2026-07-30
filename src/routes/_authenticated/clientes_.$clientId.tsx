import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteAction } from "@/components/delete-action";
import { ArrowLeft, Instagram, Phone, Mail, ExternalLink, Loader2, Palette, Plus, X, Pencil, Save, Star, Link2, Upload, Copy, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { initials, formatBRL, formatDate, relativeTime } from "@/lib/format";
import { STAGE_LABEL, STAGE_ACCENT, DELIVERY_LABEL, LIBRARY_LABEL, PACKAGE_LABEL, PRIORITY_LABEL } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority, PackageSize, DeliveryMethod, LibraryCategory } from "@/lib/video-workflow";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StartTimerButton } from "@/components/timer";
import { AddSubClientButton } from "@/routes/_authenticated/clientes";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clientes_/$clientId")({
  component: ClientDetail,
  head: () => ({ meta: [{ title: "Cliente — alves.edt" }] }),
});

const LINK_CATEGORIES = [
  { id: "video_final", label: "Vídeo final" },
  { id: "referencia", label: "Referência" },
  { id: "bruto", label: "Material bruto" },
  { id: "drive", label: "Drive" },
  { id: "roteiro", label: "Roteiro" },
  { id: "outro", label: "Outro" },
] as const;
type LinkCategory = typeof LINK_CATEGORIES[number]["id"];

const INTERACTION_KINDS = [
  { id: "reuniao", label: "Reunião" },
  { id: "ligacao", label: "Ligação" },
  { id: "mensagem", label: "Mensagem" },
  { id: "email", label: "E-mail" },
  { id: "outro", label: "Outro" },
] as const;

function ClientDetail() {
  const { clientId } = Route.useParams();
  const qc = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const [c, packs, vids, lib, acts, ints, fbs, tokens, subs] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
        supabase.from("client_packages").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("videos").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("client_library").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("activity_log").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(30),
        supabase.from("client_interactions").select("*").eq("client_id", clientId).order("happened_at", { ascending: false }),
        supabase.from("client_feedback").select("nps, comment, created_at").eq("client_id", clientId),
        supabase.from("client_portal_tokens").select("token, expires_at, revoked_at, created_at").eq("client_id", clientId).is("revoked_at", null).order("created_at", { ascending: false }).limit(1),
        supabase.from("clients").select("id, name, company, status, videos(id, status)").eq("parent_client_id", clientId).order("name"),
      ]);
      if (c.error) throw c.error;
      let parent: { id: string; name: string } | null = null;
      if (c.data?.parent_client_id) {
        const { data: p } = await supabase.from("clients").select("id, name").eq("id", c.data.parent_client_id).maybeSingle();
        parent = p ?? null;
      }
      return {
        client: c.data,
        parent,
        subs: (subs.data ?? []) as { id: string; name: string; company: string | null; status: string; videos: { id: string; status: string }[] | null }[],
        packages: packs.data ?? [],
        videos: vids.data ?? [],
        library: lib.data ?? [],
        activity: acts.data ?? [],
        interactions: ints.data ?? [],
        feedback: fbs.data ?? [],
        activeToken: tokens.data?.[0] ?? null,
      };
    },
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!client?.client) return <div className="p-8 text-center text-muted-foreground">Cliente não encontrado</div>;

  const c = client.client;
  const activePack = client.packages.find((p) => p.status === "ativo");
  const links = client.library.filter((i) => i.kind === "link");
  const files = client.library.filter((i) => i.kind !== "link");
  const npsAvg = client.feedback.length
    ? (client.feedback.reduce((s, f) => s + (f.nps ?? 0), 0) / client.feedback.length).toFixed(1)
    : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["client", clientId] });

  const isParent = client.subs.length > 0;
  const isSub = !!client.parent;

  return (
    <div className="p-6 md:p-8">
      {isSub && client.parent ? (
        <Link to="/clientes/$clientId" params={{ clientId: client.parent.id }} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />Voltar para {client.parent.name}
        </Link>
      ) : (
        <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />Todos os clientes
        </Link>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 font-display text-xl font-bold text-primary">
          {initials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{c.name}</h1>
            {isParent && (
              <Badge variant="outline" className="text-[10px]">Cliente-mãe · {client.subs.length} marca{client.subs.length === 1 ? "" : "s"}</Badge>
            )}
            {isSub && <Badge variant="secondary" className="text-[10px]">Marca</Badge>}
          </div>
          {c.company && <p className="text-sm text-muted-foreground">{c.company}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            {c.whatsapp && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.whatsapp}</span>}
            {c.instagram && <span className="inline-flex items-center gap-1"><Instagram className="h-3 w-3" />{c.instagram}</span>}
          </div>
        </div>
        {activePack && !isSub && (
          <Card className="p-4 min-w-[220px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pacote ativo</p>
            <p className="font-display text-lg font-semibold">{PACKAGE_LABEL[activePack.size as PackageSize]}</p>
            <p className="text-xs text-muted-foreground">
              {activePack.videos_used}/{activePack.total_videos} usados · {formatBRL(activePack.price)}
            </p>
          </Card>
        )}
        {isSub && client.parent && (
          <Card className="p-4 min-w-[220px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pacote</p>
            <p className="text-sm">Pertence ao pacote de <Link to="/clientes/$clientId" params={{ clientId: client.parent.id }} className="font-medium text-primary hover:underline">{client.parent.name}</Link></p>
          </Card>
        )}
        <DeleteAction
          table="clients"
          id={clientId}
          variant="button"
          label="Excluir cliente"
          title={`Excluir ${c.name}?`}
          description="Vídeos, pacotes, links, interações e histórico deste cliente serão removidos permanentemente."
          successMessage="Cliente excluído"
          invalidate={[["clients"], ["dashboard"], ["clients-min"]]}
          onDeleted={() => navigate({ to: "/clientes" })}
        />
      </div>


      <Tabs defaultValue={isParent ? "subs" : "overview"} className="mt-6">
        <TabsList className="flex-wrap h-auto">
          {isParent && <TabsTrigger value="subs">Marcas ({client.subs.length})</TabsTrigger>}
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="demands">Vídeos ({client.videos.length})</TabsTrigger>
          <TabsTrigger value="library">Biblioteca ({files.length})</TabsTrigger>
          <TabsTrigger value="links">Links ({links.length})</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          {!isSub && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
          <TabsTrigger value="relationship">Relacionamento</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {isParent && (
          <TabsContent value="subs" className="mt-4">
            <SubClientsTab parentId={clientId} subs={client.subs} onChange={invalidate} />
          </TabsContent>
        )}



        <TabsContent value="overview" className="mt-4 grid gap-3 md:grid-cols-3">
          <Card className="p-4"><Stat label="Vídeos totais" value={String(client.videos.length)} /></Card>
          <Card className="p-4"><Stat label="Em produção" value={String(client.videos.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length)} /></Card>
          <Card className="p-4"><Stat label="Entregues" value={String(client.videos.filter((v) => v.status === "entregue").length)} /></Card>
          {npsAvg && (
            <Card className="p-4 md:col-span-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Satisfação (NPS)</p>
              <p className="mt-1 font-display text-2xl font-semibold">{npsAvg} <span className="text-xs text-muted-foreground">/ 10 · {client.feedback.length} resposta{client.feedback.length === 1 ? "" : "s"}</span></p>
            </Card>
          )}
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
                  <StartTimerButton videoId={v.id} label={v.title} />
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          {files.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Biblioteca vazia.</Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {files.map((f) => (
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

        <TabsContent value="links" className="mt-4">
          <LinksTab clientId={clientId} items={links} onChange={invalidate} />
        </TabsContent>

        <TabsContent value="briefing" className="mt-4">
          <BriefingEditor client={c} onSaved={invalidate} />
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

        <TabsContent value="relationship" className="mt-4">
          <RelationshipTab
            clientId={clientId}
            interactions={client.interactions}
            feedback={client.feedback}
            activeToken={client.activeToken}
            onChange={invalidate}
          />
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

// ==================== BRIEFING EDITOR ====================

function BriefingEditor({ client, onSaved }: { client: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [colors, setColors] = useState<string[]>((client.brand_colors as string[]) ?? []);
  const [fonts, setFonts] = useState<string[]>((client.brand_fonts as string[]) ?? []);
  const [refs, setRefs] = useState<string[]>((client.brand_references as string[]) ?? []);
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newFont, setNewFont] = useState("");
  const [newRef, setNewRef] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("clients")
      .update({ brand_colors: colors, brand_fonts: fonts, brand_references: refs })
      .eq("id", client.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Briefing salvo");
    setEditing(false);
    onSaved();
  }

  function cancel() {
    setColors((client.brand_colors as string[]) ?? []);
    setFonts((client.brand_fonts as string[]) ?? []);
    setRefs((client.brand_references as string[]) ?? []);
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={cancel}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}Salvar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
        )}
      </div>

      {client.logo_url && (
        <Card className="p-4"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Logo</p><img src={client.logo_url} alt="Logo" className="max-h-24" /></Card>
      )}

      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cores da marca</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {colors.length === 0 && !editing && <span className="text-xs text-muted-foreground">Nenhuma</span>}
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
              <div className="h-4 w-4 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs">{color}</span>
              {editing && (
                <button onClick={() => setColors(colors.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-3 flex items-center gap-2">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
            <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-28" />
            <Button size="sm" variant="outline" onClick={() => { if (newColor && !colors.includes(newColor)) setColors([...colors, newColor]); }}>
              <Plus className="mr-1 h-3.5 w-3.5" />Adicionar
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fontes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {fonts.length === 0 && !editing && <span className="text-xs text-muted-foreground">Nenhuma</span>}
          {fonts.map((f, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {f}
              {editing && (
                <button onClick={() => setFonts(fonts.filter((_, idx) => idx !== i))} className="ml-1.5 text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {editing && (
          <div className="mt-3 flex gap-2">
            <Input value={newFont} onChange={(e) => setNewFont(e.target.value)} placeholder="Ex: Inter, Space Grotesk…" />
            <Button size="sm" variant="outline" onClick={() => { const v = newFont.trim(); if (v) { setFonts([...fonts, v]); setNewFont(""); } }}>
              <Plus className="mr-1 h-3.5 w-3.5" />Adicionar
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Referências</p>
        <div className="mt-2 space-y-1">
          {refs.length === 0 && !editing && <p className="text-xs text-muted-foreground">Nenhuma</p>}
          {refs.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
              {r.startsWith("http") ? (
                <a href={r} target="_blank" rel="noreferrer" className="flex-1 truncate text-xs text-primary hover:underline">{r}</a>
              ) : (
                <span className="flex-1 truncate text-xs">{r}</span>
              )}
              {editing && (
                <button onClick={() => setRefs(refs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-3 flex gap-2">
            <Input value={newRef} onChange={(e) => setNewRef(e.target.value)} placeholder="Link ou descrição…" />
            <Button size="sm" variant="outline" onClick={() => { const v = newRef.trim(); if (v) { setRefs([...refs, v]); setNewRef(""); } }}>
              <Plus className="mr-1 h-3.5 w-3.5" />Adicionar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ==================== LINKS TAB ====================

function LinksTab({ clientId, items, onChange }: { clientId: string; items: any[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<LinkCategory | "all">("all");
  const [onlyFav, setOnlyFav] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: me } = useCurrentUser();

  const filtered = items.filter((i) => {
    if (onlyFav && !i.is_favorite) return false;
    if (cat !== "all" && i.link_category !== cat) return false;
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));

  async function toggleFav(id: string, current: boolean) {
    const { error } = await supabase.from("client_library").update({ is_favorite: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }
  async function remove(id: string) {
    if (!confirm("Remover este link?")) return;
    const { error } = await supabase.from("client_library").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    onChange();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={cat} onValueChange={(v) => setCat(v as LinkCategory | "all")}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {LINK_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={onlyFav ? "default" : "outline"} onClick={() => setOnlyFav(!onlyFav)}>
          <Star className="mr-1 h-3.5 w-3.5" />Favoritos
        </Button>
        <div className="ml-auto">
          <NewLinkDialog clientId={clientId} workspaceId={me?.workspaceId ?? undefined} open={open} setOpen={setOpen} onSaved={onChange} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum link.</Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.id} className="group p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px]">
                    {LINK_CATEGORIES.find((c) => c.id === i.link_category)?.label ?? "Outro"}
                  </Badge>
                  <p className="mt-1 truncate text-sm font-medium">{i.name}</p>
                  <a href={i.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                    <Link2 className="h-3 w-3" />Abrir
                  </a>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button onClick={() => toggleFav(i.id, i.is_favorite)} className={i.is_favorite ? "text-[oklch(0.78_0.16_75)]" : "text-muted-foreground hover:text-foreground"}>
                    <Star className="h-4 w-4" fill={i.is_favorite ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => remove(i.id)} className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewLinkDialog({ clientId, workspaceId, open, setOpen, onSaved }: { clientId: string; workspaceId?: string; open: boolean; setOpen: (v: boolean) => void; onSaved: () => void }) {
  const [tab, setTab] = useState<"link" | "file">("link");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<LinkCategory>("outro");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!workspaceId) return toast.error("Sem workspace");
    if (!name.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      let finalUrl = url.trim();
      if (tab === "file") {
        if (!file) throw new Error("Selecione um arquivo");
        const path = `${workspaceId}/${clientId}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("client-library").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("client-library").getPublicUrl(path);
        finalUrl = pub.publicUrl;
      }
      if (!finalUrl) throw new Error("URL obrigatória");
      const { error } = await supabase.from("client_library").insert({
        workspace_id: workspaceId,
        client_id: clientId,
        kind: tab === "file" ? "file" : "link",
        category: "documento",
        link_category: category,
        name: name.trim(),
        url: finalUrl,
      });
      if (error) throw error;
      toast.success("Adicionado");
      setName(""); setUrl(""); setFile(null); setCategory("outro");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar à Central de Links</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "link" | "file")}>
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1"><Link2 className="mr-1 h-3.5 w-3.5" />Link</TabsTrigger>
            <TabsTrigger value="file" className="flex-1"><Upload className="mr-1 h-3.5 w-3.5" />Arquivo</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-3 space-y-2">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </TabsContent>
          <TabsContent value="file" className="mt-3 space-y-2">
            <Label>Arquivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-[10px] text-muted-foreground">Requer bucket "client-library" no storage.</p>
          </TabsContent>
        </Tabs>
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vídeo final do lançamento" />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as LinkCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LINK_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== RELATIONSHIP TAB ====================

function RelationshipTab({ clientId, interactions, feedback, activeToken, onChange }: {
  clientId: string;
  interactions: any[];
  feedback: any[];
  activeToken: { token: string; expires_at: string | null } | null;
  onChange: () => void;
}) {
  const { data: me } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("reuniao");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const portalUrl = typeof window !== "undefined" && activeToken
    ? `${window.location.origin}/portal/${activeToken.token}`
    : null;

  async function addInteraction() {
    if (!me?.workspaceId) return;
    if (!notes.trim()) return toast.error("Descreva a interação");
    setSaving(true);
    const { error } = await supabase.from("client_interactions").insert({
      workspace_id: me.workspaceId,
      client_id: clientId,
      author_id: me.id,
      kind,
      notes: notes.trim(),
      happened_at: new Date(when).toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Interação registrada");
    setOpen(false); setNotes(""); setKind("reuniao");
    onChange();
  }

  async function removeInteraction(id: string) {
    if (!confirm("Remover esta interação?")) return;
    const { error } = await supabase.from("client_interactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  async function generateToken() {
    if (!me?.workspaceId) return;
    setGenerating(true);
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const { error } = await supabase.from("client_portal_tokens").insert({
      workspace_id: me.workspaceId,
      client_id: clientId,
      created_by: me.id,
      token,
      expires_at: null,
    });
    setGenerating(false);
    if (error) return toast.error(error.message);
    toast.success("Link do portal gerado");
    onChange();
  }

  async function revokeToken() {
    if (!activeToken) return;
    if (!confirm("Revogar o link atual? Um novo pode ser gerado depois.")) return;
    const { error } = await supabase.from("client_portal_tokens").update({ revoked_at: new Date().toISOString() }).eq("token", activeToken.token);
    if (error) return toast.error(error.message);
    onChange();
  }

  async function copy() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    toast.success("Link copiado");
  }

  const npsAvg = feedback.length ? (feedback.reduce((s, f) => s + (f.nps ?? 0), 0) / feedback.length).toFixed(1) : null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portal público do cliente</p>
            <p className="mt-1 text-sm">Um link para o cliente acompanhar os vídeos, aprovar e responder NPS — sem precisar de login.</p>
          </div>
          {activeToken ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-[320px] truncate rounded bg-muted px-2 py-1 text-[11px]">{portalUrl}</code>
              <Button size="sm" variant="outline" onClick={copy}><Copy className="mr-1 h-3.5 w-3.5" />Copiar</Button>
              <Button size="sm" variant="outline" onClick={revokeToken}>Revogar</Button>
            </div>
          ) : (
            <Button size="sm" onClick={generateToken} disabled={generating}>
              {generating && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Gerar link do portal
            </Button>
          )}
        </div>
      </Card>

      {npsAvg && (
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">NPS médio</p>
          <p className="mt-1 font-display text-2xl font-semibold">{npsAvg} <span className="text-xs text-muted-foreground">/ 10</span></p>
          <div className="mt-3 space-y-1.5">
            {feedback.filter((f) => f.comment).slice(0, 5).map((f, i) => (
              <div key={i} className="rounded-md border border-border p-2 text-xs">
                <span className="font-semibold">{f.nps}/10</span> · {f.comment}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-semibold">Histórico de interações</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" />Registrar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova interação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERACTION_KINDS.map((k) => <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quando</Label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumo da conversa, decisões, próximos passos…" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={addInteraction} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {interactions.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma interação registrada.</p>
        ) : (
          <div className="space-y-2">
            {interactions.map((i) => (
              <div key={i.id} className="group flex items-start gap-3 rounded-md border border-border p-3">
                <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{INTERACTION_KINDS.find((k) => k.id === i.kind)?.label ?? i.kind}</Badge>
                    <span className="text-[11px] text-muted-foreground">{formatDate(i.happened_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{i.notes}</p>
                </div>
                <button onClick={() => removeInteraction(i.id)} className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ==================== NEW VIDEO DIALOG ====================

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

function SubClientsTab({ parentId, subs, onChange }: { parentId: string; subs: { id: string; name: string; company: string | null; status: string; videos: { id: string; status: string }[] | null }[]; onChange: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{subs.length} marca{subs.length === 1 ? "" : "s"} vinculada{subs.length === 1 ? "" : "s"}</p>
        <AddSubClientButton parentId={parentId} />
      </div>
      {subs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma marca ainda. Adicione a primeira.</Card>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => {
            const vids = s.videos ?? [];
            const pend = vids.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length;
            return (
              <Link key={s.id} to="/clientes/$clientId" params={{ clientId: s.id }} onClick={onChange}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 font-display text-sm font-semibold text-primary">
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  {s.company && <p className="truncate text-xs text-muted-foreground">{s.company}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{vids.length} vídeos · {pend} pendentes</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
