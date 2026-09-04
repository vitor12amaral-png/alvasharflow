import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteAction } from "@/components/delete-action";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Copy, FileText, FolderTree, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ferramentas")({
  component: FerramentasPage,
  head: () => ({
    meta: [
      { title: "Ferramentas — AlvasharFlow" },
      { name: "description", content: "Propostas pré-prontas e organizador de pastas para clientes." },
      { property: "og:title", content: "Ferramentas — AlvasharFlow" },
      { property: "og:description", content: "Modelos de proposta com variáveis e estrutura de pastas por cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FerramentasPage() {
  const [tab, setTab] = useState<"propostas" | "pastas">("propostas");
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Ferramentas"
        subtitle="Propostas prontas e organização de pastas"
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "propostas", label: "Propostas", icon: <FileText className="h-3.5 w-3.5" /> },
              { value: "pastas", label: "Pastas", icon: <FolderTree className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div className="mt-6">{tab === "propostas" ? <Proposals /> : <DriveOrganizer />}</div>
    </div>
  );
}

/* ---------------- Propostas ---------------- */

type Proposal = { id: string; category: string; title: string; body: string; position: number };

function fillVars(body: string, vars: { cliente: string; quantidade: string; valor: string }) {
  return body
    .replaceAll("{{nome_cliente}}", vars.cliente || "{{nome_cliente}}")
    .replaceAll("{{quantidade_videos}}", vars.quantidade || "{{quantidade_videos}}")
    .replaceAll("{{valor}}", vars.valor || "{{valor}}");
}

function Proposals() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [open, setOpen] = useState(false);
  const [vars, setVars] = useState({ cliente: "", quantidade: "", valor: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["proposal-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("id, category, title, body, position")
        .order("category")
        .order("position");
      if (error) throw error;
      return (data ?? []) as Proposal[];
    },
  });

  const byCategory = useMemo(() => {
    const map = new Map<string, Proposal[]>();
    (data ?? []).forEach((p) => map.set(p.category, [...(map.get(p.category) ?? []), p]));
    return Array.from(map.entries());
  }, [data]);

  const save = useMutation({
    mutationFn: async (form: { id?: string; category: string; title: string; body: string }) => {
      if (form.id) {
        const { error } = await supabase.from("proposal_templates")
          .update({ category: form.category, title: form.title, body: form.body }).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposal_templates").insert({
          workspace_id: me?.workspaceId ?? "", category: form.category, title: form.title, body: form.body,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proposal-templates"] }); setOpen(false); setEditing(null); toast.success("Proposta salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copy(p: Proposal) {
    await navigator.clipboard.writeText(fillVars(p.body, vars));
    toast.success("Proposta copiada");
  }

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="space-y-1.5"><Label className="text-xs">Nome do cliente</Label>
          <Input value={vars.cliente} onChange={(e) => setVars({ ...vars, cliente: e.target.value })} placeholder="Ex: Bruna" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Quantidade de vídeos</Label>
          <Input value={vars.quantidade} onChange={(e) => setVars({ ...vars, quantidade: e.target.value })} placeholder="Ex: 10" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Valor</Label>
          <Input value={vars.valor} onChange={(e) => setVars({ ...vars, valor: e.target.value })} placeholder="Ex: R$ 2.500" /></div>
        <div className="flex items-end">
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="w-full"><Plus className="mr-1.5 h-4 w-4" />Nova</Button>
        </div>
      </Card>

      {byCategory.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma proposta salva ainda. Crie a primeira para reaproveitar em novos clientes.
        </div>
      )}

      {byCategory.map(([category, items]) => (
        <Card key={category} className="p-5">
          <p className="mb-3 font-display text-sm font-semibold">{category}</p>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-lg border border-border/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{fillVars(p.body, vars)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copy(p)}>
                      <Copy className="mr-1 h-3 w-3" />Copiar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(p); setOpen(true); }}>Editar</Button>
                    <DeleteAction table="proposal_templates" id={p.id} label="proposta" invalidate={[["proposal-templates"]]} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <ProposalForm key={editing?.id ?? "new"} initial={editing} saving={save.isPending} onSubmit={(form) => save.mutate({ ...form, id: editing?.id })} />
      </Dialog>
    </div>
  );
}

function ProposalForm({ initial, onSubmit, saving }: {
  initial: Proposal | null;
  onSubmit: (form: { category: string; title: string; body: string }) => void;
  saving: boolean;
}) {
  const [category, setCategory] = useState(initial?.category ?? "Geral");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Editar proposta" : "Nova proposta"}</DialogTitle></DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); if (!title.trim()) { toast.error("Dê um título"); return; } onSubmit({ category: category.trim() || "Geral", title: title.trim(), body }); }}
      >
        <div className="space-y-1.5"><Label>Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Pacote mensal" /></div>
        <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Proposta 10 vídeos" /></div>
        <div className="space-y-1.5">
          <Label>Texto</Label>
          <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder={"Olá {{nome_cliente}}, sua proposta de {{quantidade_videos}} vídeos por {{valor}}…"} />
          <p className="text-[11px] text-muted-foreground">Variáveis: <code>{"{{nome_cliente}}"}</code>, <code>{"{{quantidade_videos}}"}</code>, <code>{"{{valor}}"}</code></p>
        </div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ---------------- Organizador de pastas ---------------- */

const FALLBACK_FOLDERS = ["01 Brutos", "02 Edição", "03 Exportados", "04 Aprovados", "05 Identidade visual"];

function DriveOrganizer() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [clientId, setClientId] = useState("");
  const [link, setLink] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["ws-settings-drive", me?.workspaceId],
    enabled: !!me?.workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_settings")
        .select("drive_folder_url, drive_root_folder_id, drive_folder_template")
        .eq("workspace_id", me?.workspaceId ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-drive"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, drive_folder_url").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const template = useMemo(() => {
    const raw = settings?.drive_folder_template;
    const list = Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
    return list.length ? list : FALLBACK_FOLDERS;
  }, [settings]);

  const client = (clients ?? []).find((c) => c.id === clientId);

  const saveLink = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update({ drive_folder_url: link || null }).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients-drive"] }); toast.success("Pasta do cliente salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <p className="font-display text-sm font-semibold">Estrutura padrão de pastas</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {settings?.drive_root_folder_id
            ? "Modelo definido nas Configurações."
            : "Nenhum modelo salvo ainda — usando a estrutura sugerida. Ajuste em Configurações."}
        </p>
        <ul className="mt-3 space-y-1.5">
          {template.map((folder) => (
            <li key={folder} className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm">
              <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />{folder}
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={async () => {
            const name = client?.name ?? "Cliente";
            await navigator.clipboard.writeText([name, ...template.map((f) => `  ${f}`)].join("\n"));
            toast.success("Estrutura copiada — cole ao criar as pastas no Drive");
          }}
        >
          <Copy className="mr-1.5 h-4 w-4" />Copiar estrutura
        </Button>
      </Card>

      <Card className="p-5">
        <p className="font-display text-sm font-semibold">Pasta do cliente</p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v); setLink((clients ?? []).find((c) => c.id === v)?.drive_folder_url ?? ""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Link da pasta no Drive</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/..." disabled={!clientId} />
          </div>
          <Button disabled={!clientId || saveLink.isPending} onClick={() => saveLink.mutate()}>
            {saveLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar link
          </Button>
          {client?.drive_folder_url && (
            <a href={client.drive_folder_url} target="_blank" rel="noreferrer" className="block text-xs text-primary underline">
              Abrir pasta atual de {client.name}
            </a>
          )}
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="mb-2 text-[10px]">Google Drive</Badge>
            <p>A criação automática das pastas exige conectar sua conta Google. Enquanto isso, copie a estrutura ao lado, crie no Drive e cole aqui o link da pasta.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
