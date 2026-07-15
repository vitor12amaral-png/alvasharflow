import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/portal" });
  },
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro — Nexo" }] }),
});

function FinanceiroPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*, clients(name)").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientsList } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const today = new Date().toISOString().slice(0, 10);
  const list = (invoices ?? []).map((i: any) => ({
    ...i,
    computed: i.status === "pending" && i.due_date && i.due_date < today ? "overdue" : i.status,
  }));

  const totals = {
    received: list.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.amount_cents, 0),
    pending: list.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + i.amount_cents, 0),
    overdue: list.filter((i: any) => i.computed === "overdue").reduce((s: number, i: any) => s + i.amount_cents, 0),
  };

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Cobrança marcada como paga"); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Cobrança removida"); },
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Financeiro"
        subtitle="Cobranças por cliente"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova cobrança</Button></DialogTrigger>
            <NewInvoiceDialog onClose={() => setOpen(false)} clients={clientsList ?? []} />
          </Dialog>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Recebido" value={formatBRL(totals.received)} tone="ok" />
        <Kpi label="A receber" value={formatBRL(totals.pending)} />
        <Kpi label="Em atraso" value={formatBRL(totals.overdue)} tone={totals.overdue > 0 ? "warn" : undefined} />
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma cobrança criada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
                <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i: any) => (
                <tr key={i.id} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium">{i.clients?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.description}</td>
                  <td className="px-4 py-3">{formatDate(i.due_date)}</td>
                  <td className="px-4 py-3 text-right font-display font-semibold">{formatBRL(i.amount_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={i.computed} /></td>
                  <td className="px-4 py-3 text-right">
                    {i.status !== "paid" && (
                      <button onClick={() => markPaid.mutate(i.id)} className="mr-1 rounded-md p-1.5 text-[oklch(0.72_0.17_155)] hover:bg-[oklch(0.72_0.17_155_/_0.15)]" title="Marcar como pago">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => { if (confirm("Excluir cobrança?")) del.mutate(i.id); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-5">
      <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className={`mt-3 font-display text-2xl font-semibold ${tone === "warn" ? "text-[oklch(0.78_0.16_75)]" : tone === "ok" ? "text-[oklch(0.72_0.17_155)]" : ""}`}>{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-[oklch(0.72_0.17_155_/_0.15)] text-[oklch(0.72_0.17_155)]" },
    pending: { label: "Pendente", cls: "bg-primary/15 text-primary" },
    overdue: { label: "Atrasado", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? map.pending;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${m.cls}`}>{m.label}</span>;
}

function NewInvoiceDialog({ onClose, clients }: { onClose: () => void; clients: { id: string; name: string }[] }) {
  const [form, setForm] = useState({ client_id: "", description: "", amount: "", due_date: "" });
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    const amount_cents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    if (!Number.isFinite(amount_cents) || amount_cents < 0) { toast.error("Valor inválido"); return; }
    setLoading(true);
    const { error } = await supabase.from("invoices").insert({
      client_id: form.client_id,
      description: form.description,
      amount_cents,
      due_date: form.due_date || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cobrança criada");
    qc.invalidateQueries({ queryKey: ["invoices"] });
    onClose();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova cobrança</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Descrição *</Label>
          <Input id="desc" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Edição outubro — pacote 4 vídeos" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amt">Valor (R$) *</Label>
            <Input id="amt" required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Vencimento</Label>
            <Input id="due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
