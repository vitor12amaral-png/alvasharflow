import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ExternalLink, FileText, Link as LinkIcon, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DeleteAction } from "@/components/delete-action";

export const Route = createFileRoute("/_authenticated/marketing")({
  component: MarketingPage,
  head: () => ({ meta: [{ title: "Marketing — AlvasharFlow" }] }),
});

type Channel = "instagram" | "tiktok" | "youtube" | "linkedin" | "outro";
type ScriptStatus = "ideia" | "roteiro" | "gravado" | "publicado";
type ContentType = "reels" | "post" | "story" | "carousel" | "video_longo" | "shorts" | "artigo" | "outro";

const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", outro: "Outro",
};
const STATUS_LABEL: Record<ScriptStatus, string> = {
  ideia: "Ideia", roteiro: "Roteiro", gravado: "Gravado", publicado: "Publicado",
};
const STATUS_TINT: Record<ScriptStatus, string> = {
  ideia: "bg-muted/40 text-muted-foreground border-border",
  roteiro: "bg-primary/10 text-primary border-primary/30",
  gravado: "bg-[oklch(0.78_0.16_75)]/10 text-[oklch(0.78_0.16_75)] border-[oklch(0.78_0.16_75)]/30",
  publicado: "bg-[oklch(0.68_0.16_150)]/10 text-[oklch(0.68_0.16_150)] border-[oklch(0.68_0.16_150)]/30",
};
const CONTENT_LABEL: Record<ContentType, string> = {
  reels: "Reels", post: "Post", story: "Story", carousel: "Carrossel",
  video_longo: "Vídeo longo", shorts: "Shorts", artigo: "Artigo", outro: "Outro",
};

function MarketingPage() {
  const [tab, setTab] = useState<"roteiros" | "ideias" | "referencias">("roteiros");
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Marketing"
        subtitle="Roteiros, ideias e referências criativas"
        actions={tab === "referencias" ? <NewReferenceDialog /> : <NewScriptDialog />}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
        <TabsList>
          <TabsTrigger value="roteiros"><FileText className="mr-1 h-3.5 w-3.5" />Roteiros</TabsTrigger>
          <TabsTrigger value="ideias"><Megaphone className="mr-1 h-3.5 w-3.5" />Ideias</TabsTrigger>
          <TabsTrigger value="referencias"><LinkIcon className="mr-1 h-3.5 w-3.5" />Referências</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "roteiros" && <ScriptsBoard filter={(s) => s !== "ideia"} />}
      {tab === "ideias" && <IdeasGrid />}
      {tab === "referencias" && <ReferencesList />}
    </div>
  );
}

function useScripts() {
  return useQuery({
    queryKey: ["marketing-scripts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketing_scripts")
        .select("id, title, channel, status, content_type, hook, development, cta, scheduled_for, client_id, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ScriptsBoard({ filter }: { filter: (s: ScriptStatus) => boolean }) {
  const { data, isLoading } = useScripts();
  const qc = useQueryClient();
  const cols: ScriptStatus[] = ["roteiro", "gravado", "publicado"];
  const list = (data ?? []).filter((s) => filter(s.status as ScriptStatus));

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ScriptStatus }) => {
      const { error } = await supabase.from("marketing_scripts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-scripts"] }),
  });

  if (isLoading) return <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {cols.map((col) => {
        const items = list.filter((s) => s.status === col);
        return (
          <div key={col} className="rounded-lg border border-border bg-card/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-semibold">{STATUS_LABEL[col]}</p>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((s) => <ScriptCard key={s.id} script={s} onStatus={(st) => updateStatus.mutate({ id: s.id, status: st })} />)}
              {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Vazio</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IdeasGrid() {
  const { data, isLoading } = useScripts();
  const qc = useQueryClient();
  const ideas = (data ?? []).filter((s) => s.status === "ideia");

  const promote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_scripts").update({ status: "roteiro" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-scripts"] }); toast.success("Promovido a roteiro"); },
  });

  if (isLoading) return <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (ideas.length === 0) return <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Nenhuma ideia ainda. Adicione uma em "Nova".</Card>;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {ideas.map((s) => (
        <Card key={s.id} className="p-3 hover:border-primary/40 transition">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{s.title}</p>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]">{CHANNEL_LABEL[s.channel as Channel]}</Badge>
              <DeleteAction
                table="marketing_scripts"
                id={s.id}
                title={`Excluir "${s.title}"?`}
                description="A ideia será removida permanentemente."
                successMessage="Ideia excluída"
                invalidate={[["marketing-scripts"]]}
              />
            </div>
          </div>
          {s.hook && <p className="mt-2 text-[11px] text-muted-foreground line-clamp-3">{s.hook}</p>}
          <Button size="sm" variant="outline" className="mt-3 w-full h-7 text-xs" onClick={() => promote.mutate(s.id)}>
            Promover a roteiro
          </Button>

        </Card>
      ))}
    </div>
  );
}

function ScriptCard({ script, onStatus }: { script: any; onStatus: (s: ScriptStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="p-3 cursor-pointer hover:border-primary/40 transition" onClick={() => setOpen(true)}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium line-clamp-2">{script.title}</p>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={cn("text-[10px]", STATUS_TINT[script.status as ScriptStatus])}>{STATUS_LABEL[script.status as ScriptStatus]}</Badge>
            <DeleteAction
              table="marketing_scripts"
              id={script.id}
              title={`Excluir "${script.title}"?`}
              description="O roteiro será removido permanentemente."
              successMessage="Roteiro excluído"
              invalidate={[["marketing-scripts"]]}
            />
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{CHANNEL_LABEL[script.channel as Channel]}</Badge>
          <Badge variant="outline" className="text-[10px]">{CONTENT_LABEL[script.content_type as ContentType]}</Badge>
          {script.clients && <Badge variant="secondary" className="text-[10px]">{script.clients.name}</Badge>}
          {script.scheduled_for && <span className="text-[10px] text-muted-foreground">{formatDate(script.scheduled_for)}</span>}
        </div>
      </Card>
      <ScriptDetailDialog open={open} onOpenChange={setOpen} script={script} onStatus={onStatus} />
    </>
  );
}

function ScriptDetailDialog({ open, onOpenChange, script, onStatus }: { open: boolean; onOpenChange: (v: boolean) => void; script: any; onStatus: (s: ScriptStatus) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{script.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge>{CHANNEL_LABEL[script.channel as Channel]}</Badge>
            <Badge variant="outline">{CONTENT_LABEL[script.content_type as ContentType]}</Badge>
            <Select value={script.status} onValueChange={(v) => onStatus(v as ScriptStatus)}>
              <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {script.hook && <div><p className="font-display text-xs uppercase tracking-wider text-muted-foreground">Gancho</p><p className="mt-1">{script.hook}</p></div>}
          {script.development && <div><p className="font-display text-xs uppercase tracking-wider text-muted-foreground">Desenvolvimento</p><p className="mt-1 whitespace-pre-wrap">{script.development}</p></div>}
          {script.cta && <div><p className="font-display text-xs uppercase tracking-wider text-muted-foreground">CTA</p><p className="mt-1">{script.cta}</p></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReferencesList() {
  const { data, isLoading } = useQuery({
    queryKey: ["marketing-refs"],
    queryFn: async () => (await supabase.from("marketing_references").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  if (isLoading) return <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data?.length) return <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Nenhuma referência ainda.</Card>;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((r) => (
        <Card key={r.id} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium line-clamp-2">{r.title}</p>
            <div className="flex items-center gap-1">
              <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
              <DeleteAction
                table="marketing_references"
                id={r.id}
                title={`Excluir "${r.title}"?`}
                description="A referência será removida permanentemente."
                successMessage="Referência excluída"
                invalidate={[["marketing-refs"]]}
              />
            </div>
          </div>

          {r.note && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-3">{r.note}</p>}
        </Card>
      ))}
    </div>
  );
}

function NewScriptDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<Channel>("instagram");
  const [contentType, setContentType] = useState<ContentType>("reels");
  const [status, setStatus] = useState<ScriptStatus>("ideia");
  const [hook, setHook] = useState("");
  const [development, setDevelopment] = useState("");
  const [cta, setCta] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [clientId, setClientId] = useState("none");
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  async function save() {
    if (!title.trim() || !user?.workspaceId) return;
    const { error } = await supabase.from("marketing_scripts").insert({
      workspace_id: user.workspaceId,
      title: title.trim(),
      channel, content_type: contentType, status,
      hook: hook.trim() || null,
      development: development.trim() || null,
      cta: cta.trim() || null,
      scheduled_for: scheduledFor || null,
      client_id: clientId === "none" ? null : clientId,
      author_id: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Criado");
    setOpen(false); setTitle(""); setHook(""); setDevelopment(""); setCta(""); setScheduledFor("");
    qc.invalidateQueries({ queryKey: ["marketing-scripts"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Novo</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo conteúdo</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CHANNEL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONTENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ScriptStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Publicar em</Label>
              <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Gancho</Label><Textarea rows={2} value={hook} onChange={(e) => setHook(e.target.value)} /></div>
          <div><Label>Desenvolvimento</Label><Textarea rows={4} value={development} onChange={(e) => setDevelopment(e.target.value)} /></div>
          <div><Label>CTA</Label><Textarea rows={2} value={cta} onChange={(e) => setCta(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewReferenceDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();

  async function save() {
    if (!title.trim() || !url.trim() || !user?.workspaceId) return;
    const { error } = await supabase.from("marketing_references").insert({
      workspace_id: user.workspaceId,
      title: title.trim(),
      url: url.trim(),
      note: note.trim() || null,
      author_id: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false); setTitle(""); setUrl(""); setNote("");
    qc.invalidateQueries({ queryKey: ["marketing-refs"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Nova referência</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova referência</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div><Label>Nota</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
