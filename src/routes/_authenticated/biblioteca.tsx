import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ExternalLink, Trash2, FolderOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LIBRARY_LABEL } from "@/lib/video-workflow";
import type { LibraryCategory } from "@/lib/video-workflow";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  component: BibliotecaPage,
  head: () => ({ meta: [{ title: "Biblioteca — Cortex" }] }),
});

function BibliotecaPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: async () => {
      const [c, l] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("client_library").select("*").order("created_at", { ascending: false }),
      ]);
      return { clients: c.data ?? [], items: l.data ?? [] };
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_library").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); toast.success("Arquivo removido"); },
  });

  if (isLoading || !data) return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const grouped = data.clients.map((c) => ({
    client: c,
    items: data.items.filter((i) => i.client_id === c.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Biblioteca"
        subtitle={`${data.items.length} arquivo${data.items.length === 1 ? "" : "s"} em ${grouped.length} cliente${grouped.length === 1 ? "" : "s"}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Novo arquivo</Button></DialogTrigger>
            <NewLibraryItem clients={data.clients} onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      {grouped.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">Biblioteca vazia.</Card>
      ) : (
        <div className="mt-6 space-y-4">
          {grouped.map((g) => (
            <Card key={g.client.id} className="p-5">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <Link to="/clientes/$clientId" params={{ clientId: g.client.id }} className="font-display font-semibold hover:underline">
                  {g.client.name}
                </Link>
                <span className="text-xs text-muted-foreground">· {g.items.length}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((i) => (
                  <div key={i.id} className="group flex items-center gap-2 rounded-md border border-border p-2.5">
                    <Badge variant="outline" className="text-[9px]">{LIBRARY_LABEL[i.category as LibraryCategory]}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{i.name}</p>
                      <a href={i.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                        Abrir <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    <button onClick={() => confirm("Remover?") && del.mutate(i.id)} className="opacity-0 transition group-hover:opacity-100">
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewLibraryItem({ clients, onClose }: { clients: { id: string; name: string }[]; onClose: () => void }) {
  const [form, setForm] = useState<{ client_id: string; category: LibraryCategory; name: string; url: string }>({
    client_id: "", category: "documento", name: "", url: "",
  });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    if (!me?.workspaceId) { toast.error("Workspace não encontrado"); return; }
    setSaving(true);
    const { error } = await supabase.from("client_library").insert({ ...form, workspace_id: me.workspaceId });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Arquivo adicionado");
    qc.invalidateQueries({ queryKey: ["library"] });
    onClose();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo arquivo na biblioteca</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5"><Label>Cliente *</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as LibraryCategory })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LIBRARY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>URL *</Label><Input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
