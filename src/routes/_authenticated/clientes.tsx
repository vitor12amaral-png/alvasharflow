import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Instagram, Phone, Loader2, ChevronRight, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { initials, formatBRL } from "@/lib/format";
import { ClientWizard } from "@/components/client-wizard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DeleteAction } from "@/components/delete-action";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes — alves.edt" }] }),
});

type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  parent_client_id: string | null;
  client_packages: { id: string; total_videos: number; videos_used: number; price: number; status: string }[] | null;
  videos: { id: string; status: string; due_date: string | null }[] | null;
};

function ClientesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, client_packages(id, total_videos, videos_used, price, status), videos(id, status, due_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  const { parents, childrenByParent } = useMemo(() => {
    const all = clients ?? [];
    const children = new Map<string, ClientRow[]>();
    const parents: ClientRow[] = [];
    for (const c of all) {
      if (c.parent_client_id) {
        const arr = children.get(c.parent_client_id) ?? [];
        arr.push(c);
        children.set(c.parent_client_id, arr);
      } else {
        parents.push(c);
      }
    }
    return { parents, childrenByParent: children };
  }, [clients]);

  const matches = (c: ClientRow) =>
    !q ||
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.company ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(q.toLowerCase());

  const filteredParents = parents.filter((p) => matches(p) || (childrenByParent.get(p.id) ?? []).some(matches));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Clientes"
        subtitle={`${filteredParents.length} ${filteredParents.length === 1 ? "cliente" : "clientes"}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
            </DialogTrigger>
            <ClientWizard onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="mt-6 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente ou marca…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filteredParents.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente. Clique em "Novo cliente" para começar.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {filteredParents.map((c) => (
            <ParentCard
              key={c.id}
              client={c}
              subs={childrenByParent.get(c.id) ?? []}
              open={expanded.has(c.id)}
              onToggle={() => toggle(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParentCard({ client, subs, open, onToggle }: { client: ClientRow; subs: ClientRow[]; open: boolean; onToggle: () => void }) {
  const pack = client.client_packages?.find((p) => p.status === "ativo");
  const allVids = [...(client.videos ?? []), ...subs.flatMap((s) => s.videos ?? [])];
  const today = new Date().toISOString().slice(0, 10);
  const entregues = allVids.filter((v) => v.status === "entregue").length;
  const pendentes = allVids.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length;
  const atrasados = allVids.filter((v) => v.due_date && v.due_date < today && v.status !== "entregue" && v.status !== "aprovado").length;
  const alocados = pack?.videos_used ?? 0;
  const total = pack?.total_videos ?? 0;
  const pct = total > 0 ? Math.min(100, (alocados / total) * 100) : 0;
  const hasSubs = subs.length > 0;

  return (
    <Card className="overflow-hidden transition hover:border-primary/40">
      <div className="flex items-start gap-3 p-5">
        {hasSubs ? (
          <button
            onClick={onToggle}
            className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={open ? "Recolher marcas" : "Expandir marcas"}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <div className="w-6" />
        )}
        <Link to="/clientes/$clientId" params={{ clientId: client.id }} className="group flex flex-1 min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 font-display font-semibold text-primary">
            {initials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-base font-semibold group-hover:text-primary">{client.name}</p>
              {hasSubs && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Users className="h-3 w-3" />{subs.length} marca{subs.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {client.company && <p className="truncate text-xs text-muted-foreground">{client.company}</p>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {client.whatsapp && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.whatsapp}</span>}
              {client.instagram && <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />{client.instagram}</span>}
            </div>
          </div>
          <div className="hidden sm:block min-w-[220px]">
            {pack && (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{alocados}/{total} do pacote</span>
                  <span className="font-medium">{formatBRL(pack.price)}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_260)]" style={{ width: `${pct}%` }} />
                </div>
              </>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <MiniStat label="Pendentes" value={pendentes} />
              <MiniStat label="Entregues" value={entregues} />
              <MiniStat label="Atrasados" value={atrasados} tone={atrasados > 0 ? "danger" : undefined} />
            </div>
          </div>
        </Link>
        <DeleteAction
          table="clients"
          id={client.id}
          title={`Excluir ${client.name}?`}
          description="Todos os vídeos, pacotes, links e histórico deste cliente serão removidos permanentemente."
          successMessage="Cliente excluído"
          invalidate={[["clients"], ["dashboard"], ["clients-min"]]}
          className="mt-1"
        />
      </div>

      {open && hasSubs && (
        <div className="border-t border-border bg-muted/20">
          {subs.map((s) => {
            const svids = s.videos ?? [];
            const sPend = svids.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length;
            return (
              <Link
                key={s.id}
                to="/clientes/$clientId"
                params={{ clientId: s.id }}
                className="flex items-center gap-3 border-b border-border/60 px-6 py-3 pl-14 last:border-0 hover:bg-muted/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted font-display text-xs font-semibold">
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  {s.company && <p className="truncate text-[11px] text-muted-foreground">{s.company}</p>}
                </div>
                <span className="text-[11px] text-muted-foreground">{svids.length} vídeos · {sPend} pendentes</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
          <div className="px-6 py-2 pl-14">
            <AddSubClientButton parentId={client.id} />
          </div>
        </div>
      )}
      {!hasSubs && (
        <div className="border-t border-border bg-muted/10 px-6 py-2 pl-14">
          <AddSubClientButton parentId={client.id} />
        </div>
      )}
    </Card>
  );
}

export function AddSubClientButton({ parentId }: { parentId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const workspaceId = me?.workspaceId ?? null;

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe um nome");
      if (!workspaceId) throw new Error("Workspace indisponível");
      const { error } = await supabase.from("clients").insert({
        name: name.trim(),
        company: company.trim() || null,
        parent_client_id: parentId,
        workspace_id: workspaceId,
        status: "ativo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marca adicionada");
      setName(""); setCompany(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", parentId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
          <Plus className="mr-1 h-3 w-3" />Adicionar marca
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova marca (sub-cliente)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Marca X" /></div>
          <div><Label>Empresa (opcional)</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <p className="text-[11px] text-muted-foreground">A marca herda o pacote do cliente-mãe automaticamente.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div>
      <p className={`font-display text-base font-semibold ${tone === "danger" && value > 0 ? "text-destructive" : ""}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
