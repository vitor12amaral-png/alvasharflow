import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/portal/financeiro")({
  component: PortalFinanceiro,
  head: () => ({ meta: [{ title: "Cobranças — Nexo" }] }),
});

function PortalFinanceiro() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Cobranças" subtitle="Suas faturas e pagamentos" />
      {isLoading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (invoices ?? []).length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">Nenhuma cobrança emitida.</Card>
      ) : (
        <div className="mt-6 space-y-3">
          {(invoices ?? []).map((i: any) => {
            const computed = i.status === "pending" && i.due_date && i.due_date < today ? "overdue" : i.status;
            return (
              <Card key={i.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{i.description}</p>
                  <p className="text-xs text-muted-foreground">Vencimento: {formatDate(i.due_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold">{formatBRL(i.amount_cents)}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                    computed === "paid" ? "bg-[oklch(0.72_0.17_155_/_0.15)] text-[oklch(0.72_0.17_155)]" :
                    computed === "overdue" ? "bg-destructive/15 text-destructive" :
                    "bg-primary/15 text-primary"
                  }`}>
                    {computed === "paid" ? "Pago" : computed === "overdue" ? "Atrasado" : "Pendente"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
