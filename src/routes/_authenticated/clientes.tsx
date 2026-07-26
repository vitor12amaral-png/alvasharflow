import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Instagram, Phone, Loader2 } from "lucide-react";
import { useState } from "react";
import { initials, formatBRL } from "@/lib/format";
import { ClientWizard } from "@/components/client-wizard";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes — alves.edt" }] }),
});

function ClientesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, client_packages(id, total_videos, videos_used, price, status), videos(id, status, due_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (clients ?? []).filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.company ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Clientes"
        subtitle={`${filtered.length} ${filtered.length === 1 ? "cliente" : "clientes"}`}
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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente. Clique em "Novo cliente" para começar.</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const pack = c.client_packages?.find((p: { status: string }) => p.status === "ativo");
            const vids: { status: string; due_date: string | null }[] = c.videos ?? [];
            const today = new Date().toISOString().slice(0, 10);
            const entregues = vids.filter((v) => v.status === "entregue").length;
            const pendentes = vids.filter((v) => v.status !== "entregue" && v.status !== "aprovado").length;
            const atrasados = vids.filter((v) => v.due_date && v.due_date < today && v.status !== "entregue" && v.status !== "aprovado").length;
            const alocados = pack?.videos_used ?? 0;
            const total = pack?.total_videos ?? 0;
            const pct = total > 0 ? Math.min(100, (alocados / total) * 100) : 0;
            return (
              <Link key={c.id} to="/clientes/$clientId" params={{ clientId: c.id }} className="group">
                <Card className="p-5 transition hover:border-primary/40 hover:shadow-[0_0_0_1px_oklch(0.72_0.19_235_/_0.25)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 font-display font-semibold text-primary">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold">{c.name}</p>
                      {c.company && <p className="truncate text-xs text-muted-foreground">{c.company}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {c.whatsapp && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.whatsapp}</span>}
                    {c.instagram && <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />{c.instagram}</span>}
                  </div>
                  {pack && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{alocados}/{total} alocados</span>
                        <span className="font-medium">{formatBRL(pack.price)}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_260)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2 text-[11px]">
                    <MiniStat label="Pendentes" value={pendentes} />
                    <MiniStat label="Entregues" value={entregues} />
                    <MiniStat label="Atrasados" value={atrasados} tone={atrasados > 0 ? "danger" : undefined} />
                  </div>
                  <div className="mt-2 text-right text-xs text-primary transition group-hover:translate-x-0.5">Abrir →</div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
