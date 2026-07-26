import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações — alves.edt" }] }),
});

function ConfigPage() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!user) return null;

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Configurações" />

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary">
            {initials(user.fullName ?? user.email)}
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">{user.fullName ?? "Sem nome"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge className="mt-1 text-[9px]">{user.role}</Badge>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />Sair da conta
          </Button>
        </div>
      </Card>
    </div>
  );
}
