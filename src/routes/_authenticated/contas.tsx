import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlatformAccounts, setAccountPlan, type PlatformAccount } from "@/lib/platform.functions";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contas")({
  component: ContasPage,
  head: () => ({
    meta: [
      { title: "Contas da plataforma | AlvasharFlow" },
      { name: "description", content: "Painel do dono: veja o plano de cada conta, validade do teste e reative acessos." },
      { property: "og:title", content: "Contas da plataforma | AlvasharFlow" },
      { property: "og:description", content: "Gerencie planos, testes e reativação de contas do AlvasharFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function fmt(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ContasPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPlatformAccounts);
  const setPlan = useServerFn(setAccountPlan);

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-accounts"],
    queryFn: () => list({}),
    retry: false,
  });

  const mut = useMutation({
    mutationFn: (vars: { workspace_id: string; action: "activate" | "suspend" | "extend" }) =>
      setPlan({ data: { ...vars, days: 30 } }),
    onSuccess: () => {
      toast.success("Conta atualizada");
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-md p-6 text-center text-sm text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-5 w-5" />
          Esta área é restrita ao dono da plataforma.
        </Card>
      </div>
    );
  }

  const accounts = (data ?? []) as PlatformAccount[];

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Contas" subtitle="Planos, testes e reativação de acesso." />

      <div className="mt-4 space-y-2">
        {accounts.map((a) => (
          <Card key={a.workspace_id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <Badge variant={a.active ? "default" : "destructive"} className="text-[10px]">
                  {a.plan === "active" ? "Ativa" : a.plan === "suspended" ? "Suspensa" : a.active ? "Teste" : "Teste vencido"}
                </Badge>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {a.owner_email ?? "sem e-mail"} • {a.clients} clientes • {a.videos} vídeos • {a.members} membros
                {a.plan === "trial" ? ` • teste até ${fmt(a.trial_ends_at)}` : ""}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" disabled={mut.isPending}
                onClick={() => mut.mutate({ workspace_id: a.workspace_id, action: "extend" })}>
                +30 dias
              </Button>
              <Button size="sm" disabled={mut.isPending || a.plan === "active"}
                onClick={() => mut.mutate({ workspace_id: a.workspace_id, action: "activate" })}>
                Ativar
              </Button>
              <Button size="sm" variant="ghost" disabled={mut.isPending || a.plan === "suspended"}
                onClick={() => mut.mutate({ workspace_id: a.workspace_id, action: "suspend" })}>
                Suspender
              </Button>
            </div>
          </Card>
        ))}
        {accounts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma conta encontrada.</p>}
      </div>
    </div>
  );
}
