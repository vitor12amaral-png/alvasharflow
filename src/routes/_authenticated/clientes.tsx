import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Mail, Phone, Building2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/portal" });
  },
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes — Nexo" }] }),
});

function ClientesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*, demands(id, status), invoices(amount_cents, status)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (clients ?? []).filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Clientes"
        subtitle={`${filtered.length} ${filtered.length === 1 ? "cliente" : "clientes"} cadastrados`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
            </DialogTrigger>
            <NewClientDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="mt-6 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou email…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente ainda. Crie o primeiro.</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any) => {
            const activeDemands = c.demands?.filter((d: any) => d.status !== "done").length ?? 0;
            const pending = c.invoices?.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + i.amount_cents, 0) ?? 0;
            return (
              <Card key={c.id} className="group relative p-5 transition hover:border-primary/40">
                <button
                  onClick={() => { if (confirm(`Excluir ${c.name}? Todas as demandas e cobranças serão removidas.`)) del.mutate(c.id); }}
                  className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 font-display font-semibold text-primary">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold">{c.name}</p>
                    {c.company && <p className="truncate text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {c.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</p>}
                  {c.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</p>}
                  {c.company && <p className="flex items-center gap-2"><Building2 className="h-3 w-3" />{c.company}</p>}
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Ativas</p>
                    <p className="font-display text-base font-semibold">{activeDemands}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">A receber</p>
                    <p className="font-display text-base font-semibold">{(pending / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                  <Link to="/demandas" search={{ client: c.id }} className="ml-auto text-primary hover:underline">Ver demandas →</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewClientDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("clients").insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente cadastrado");
    qc.invalidateQueries({ queryKey: ["clients"] });
    onClose();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
