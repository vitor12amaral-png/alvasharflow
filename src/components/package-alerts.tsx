import { Link } from "@tanstack/react-router";
import { Bell, PackageX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePackageAlerts } from "@/hooks/use-metrics";
import { cn } from "@/lib/utils";

/** Sininho com pacotes prestes a acabar. */
export function PackageAlertsBell({ threshold = 2 }: { threshold?: number }) {
  const { data: alerts } = usePackageAlerts(threshold);
  const count = alerts?.length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            count > 0 && "text-[oklch(0.78_0.16_75)]",
          )}
          title="Alertas de pacote"
        >
          <Bell className="h-3.5 w-3.5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="right" className="w-72 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold">Pacotes acabando</p>
          <p className="text-[11px] text-muted-foreground">Restando {threshold} vídeo(s) ou menos</p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum pacote em risco. 🎉</p>
          ) : (
            alerts!.map((a) => (
              <Link
                key={a.packageId}
                to="/clientes/$clientId"
                params={{ clientId: a.clientId }}
                className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs last:border-0 hover:bg-muted/50"
              >
                <PackageX className={cn("h-3.5 w-3.5 shrink-0", a.remaining <= 0 ? "text-destructive" : "text-[oklch(0.78_0.16_75)]")} />
                <span className="min-w-0 flex-1 truncate font-medium">{a.clientName}</span>
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {a.remaining <= 0 ? "estourado" : `${a.remaining} restante(s)`} · {a.used}/{a.total}
                </span>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Faixa de alerta para colocar no topo do Dashboard. */
export function PackageAlertsBanner({ threshold = 2 }: { threshold?: number }) {
  const { data: alerts } = usePackageAlerts(threshold);
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[oklch(0.78_0.16_75_/_0.35)] bg-[oklch(0.78_0.16_75_/_0.08)] px-3 py-2">
      <PackageX className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />
      <p className="text-xs font-medium">
        {alerts.length} pacote(s) acabando — hora de renovar
      </p>
      <div className="flex flex-wrap gap-1.5">
        {alerts.slice(0, 4).map((a) => (
          <Link
            key={a.packageId}
            to="/clientes/$clientId"
            params={{ clientId: a.clientId }}
            className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[11px] hover:border-primary/50"
          >
            {a.clientName} · {Math.max(0, a.remaining)} restante(s)
          </Link>
        ))}
      </div>
    </div>
  );
}
