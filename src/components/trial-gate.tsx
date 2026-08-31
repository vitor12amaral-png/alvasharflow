import { AlertTriangle, LifeBuoy, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CurrentUser } from "@/hooks/use-current-user";
import { useBranding, DEFAULT_BRANDING } from "@/hooks/use-branding";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function daysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/** Tela mostrada quando o teste grátis termina — deixa claro que os dados continuam salvos. */
export function TrialExpired({ user, onSignOut }: { user: CurrentUser; onSignOut: () => void }) {
  const { data: branding } = useBranding();
  const brand = branding ?? DEFAULT_BRANDING;
  const supportPhone = (brand as { whatsapp_number?: string | null }).whatsapp_number ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md space-y-5 p-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-500">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-lg font-semibold">
            {user.plan === "suspended" ? "Conta suspensa" : "Seu teste grátis terminou"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.plan === "suspended"
              ? "O acesso a esta conta está suspenso no momento."
              : `O período de teste terminou em ${formatDate(user.trialEndsAt)}.`}
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3 text-left">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Nada foi perdido.</span> Todos os seus clientes, vídeos,
            tarefas e arquivos continuam salvos e voltam a aparecer assim que a conta for reativada.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {supportPhone ? (
            <Button asChild>
              <a
                href={`https://wa.me/${supportPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Olá! Quero reativar minha conta no ${brand.brand_name} (${user.email ?? ""}).`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <LifeBuoy className="mr-1.5 h-4 w-4" /> Falar com o suporte
              </a>
            </Button>
          ) : (
            <Button asChild>
              <a href={`mailto:?subject=${encodeURIComponent("Reativar conta " + brand.brand_name)}`}>
                <LifeBuoy className="mr-1.5 h-4 w-4" /> Falar com o suporte
              </a>
            </Button>
          )}
          <Button variant="ghost" onClick={onSignOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Faixa de aviso exibida nos últimos dias do teste. */
export function TrialBanner({ user }: { user: CurrentUser }) {
  const left = user.plan === "trial" ? daysLeft(user.trialEndsAt) : null;
  if (left === null || left > 7 || left < 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>
        {left === 0
          ? "Seu teste grátis termina hoje."
          : `Seu teste grátis termina em ${left} ${left === 1 ? "dia" : "dias"}.`}{" "}
        Fale com o suporte para continuar com acesso.
      </span>
    </div>
  );
}
