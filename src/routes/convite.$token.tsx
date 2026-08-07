import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$token")({
  component: ConvitePage,
  head: () => ({
    meta: [
      { title: "Convite para equipe — AlvasharFlow" },
      { name: "description", content: "Aceite o convite e comece a gerenciar as demandas de edição com o time." },
      { property: "og:title", content: "Convite para equipe — AlvasharFlow" },
      { property: "og:description", content: "Aceite o convite e entre no espaço de trabalho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Info = { workspace_name: string; email: string; role: string; expires_at: string; accepted: boolean };

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: session }] = await Promise.all([
        supabase.rpc("invite_info", { _token: token }),
        supabase.auth.getSession(),
      ]);
      setInfo(((data as any[]) ?? [])[0] ?? null);
      setAuthed(!!session.session);
      setLoading(false);
    })();
  }, [token]);

  async function accept() {
    setBusy(true);
    const { error } = await supabase.rpc("accept_workspace_invite", { _token: token });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo ao time!");
    navigate({ to: "/workflow", search: { month: undefined } });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {loading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : !info ? (
          <>
            <h1 className="font-display text-xl font-semibold">Convite inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">Este link não existe mais. Peça um novo para quem te convidou.</p>
          </>
        ) : info.accepted ? (
          <>
            <h1 className="font-display text-xl font-semibold">Convite já utilizado</h1>
            <p className="mt-2 text-sm text-muted-foreground">Entre com sua conta para acessar o espaço.</p>
            <Button className="mt-5 w-full" onClick={() => navigate({ to: "/auth" })}>Entrar</Button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold">Convite para {info.workspace_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você foi convidado como <b className="text-foreground">{info.role}</b> ({info.email}). Aceite para gerenciar as demandas do time.
            </p>
            {authed ? (
              <Button className="mt-5 w-full" disabled={busy} onClick={accept}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Aceitar convite
              </Button>
            ) : (
              <>
                <p className="mt-4 text-xs text-muted-foreground">Crie sua conta ou entre para aceitar.</p>
                <Button className="mt-3 w-full" onClick={() => navigate({ to: "/auth" })}>Entrar / Criar conta</Button>
              </>
            )}
          </>
        )}
      </Card>
    </main>
  );
}
