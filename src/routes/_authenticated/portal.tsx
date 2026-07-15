import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "Em andamento",
  review: "Revisão",
  done: "Entregue",
};

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalPage,
  head: () => ({ meta: [{ title: "Minhas demandas — Nexo" }] }),
});

function PortalPage() {
  const { data: demands, isLoading } = useQuery({
    queryKey: ["portal-demands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("demands").select("*, clients(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = ["in_progress", "review", "backlog", "done"].map((s) => ({
    key: s,
    label: STATUS_LABEL[s],
    items: (demands ?? []).filter((d) => d.status === s),
  }));

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Minhas demandas" subtitle="Acompanhe o andamento dos seus projetos" />
      {isLoading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (demands ?? []).length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          Nenhuma demanda ainda. Você será notificado quando algo for adicionado.
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map((g) => g.items.length > 0 && (
            <section key={g.key}>
              <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase">{g.label}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.items.map((d: any) => (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold">{d.title}</p>
                        {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                        d.priority === "high" ? "bg-destructive/15 text-destructive" :
                        d.priority === "medium" ? "bg-[oklch(0.78_0.16_75_/_0.15)] text-[oklch(0.78_0.16_75)]" :
                        "bg-primary/15 text-primary"
                      }`}>
                        {d.priority === "high" ? "Alta" : d.priority === "medium" ? "Média" : "Baixa"}
                      </span>
                    </div>
                    {d.due_date && <p className="mt-3 text-xs text-muted-foreground">Prazo: {formatDate(d.due_date)}</p>}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
