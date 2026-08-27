import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { BellRing, CheckCheck, CalendarClock, CheckCircle2, Send, Flame, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { formatDate, relativeTime } from "@/lib/format";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  video_id: string | null;
  task_id: string | null;
  client_id: string | null;
  read_at: string | null;
  created_at: string;
};

const ICON: Record<string, typeof BellRing> = {
  video_aprovado: CheckCircle2,
  video_entregue: Send,
  tarefa_urgente: Flame,
  prazo: CalendarClock,
  pacote_limite: Package,
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inDaysISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Central de notificações: avisos do sistema + prazos vencendo. */
export function NotificationCenter() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: rows } = useQuery({
    queryKey: ["notifications", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, title, body, link, video_id, task_id, client_id, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  // Prazos vencendo / vencidos — calculados na hora, não ficam salvos.
  const { data: dueSoon } = useQuery({
    queryKey: ["notifications-due"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, due_date, status, client_id, clients(name)")
        .not("due_date", "is", null)
        .lte("due_date", inDaysISO(2))
        .not("status", "in", "(aprovado,entregue)")
        .order("due_date")
        .limit(15);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string; title: string; due_date: string; client_id: string; clients: { name: string } | null;
      }[];
    },
  });

  const { data: packageAlerts } = useQuery({
    queryKey: ["notifications-packages", me?.workspaceId],
    enabled: !!me?.workspaceId,
    refetchInterval: 120_000,
    queryFn: async () => {
      const [settings, packages] = await Promise.all([
        supabase.from("workspace_settings").select("package_alert_threshold").eq("workspace_id", me?.workspaceId ?? "").maybeSingle(),
        supabase.from("client_packages").select("id, client_id, total_videos, videos_used, clients(name)").eq("status", "ativo"),
      ]);
      if (settings.error) throw settings.error;
      if (packages.error) throw packages.error;
      const threshold = settings.data?.package_alert_threshold ?? 2;
      return (packages.data ?? []).filter((item) => item.total_videos - item.videos_used <= threshold);
    },
  });

  // Atualização em tempo real quando um aviso novo chega.
  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", me.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [me?.id, qc]);

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = (rows ?? []).filter((n) => !n.read_at).map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", me?.id] }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", me?.id] }),
  });

  const unread = useMemo(() => (rows ?? []).filter((n) => !n.read_at).length, [rows]);
  const overdue = (dueSoon ?? []).filter((v) => v.due_date < todayISO()).length;
  const badge = unread + overdue + (packageAlerts?.length ?? 0);

  function openNotification(notification: Notification) {
    markOne.mutate(notification.id);
    if (notification.video_id) {
      navigate({ to: "/workflow", search: { client: notification.client_id ?? "all", video: notification.video_id, view: "kanban" } });
    } else if (notification.task_id) {
      navigate({ to: "/tarefas", search: { task: notification.task_id } } as never);
    } else if (notification.client_id) {
      navigate({ to: "/clientes/$clientId", params: { clientId: notification.client_id } });
    } else if (notification.link) {
      const destination = notification.link.startsWith("/fila") ? "/workflow?view=fila&client=all" : notification.link;
      navigate({ to: destination } as never);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            badge > 0 && "text-primary",
          )}
          title="Notificações"
        >
          <BellRing className="h-3.5 w-3.5" />
          {badge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="right" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <p className="text-xs font-semibold">Notificações</p>
            <p className="text-[11px] text-muted-foreground">{badge === 0 ? "Tudo em dia" : `${badge} aviso(s)`}</p>
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Marcar lidas
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {(dueSoon ?? []).length > 0 && (
            <div className="border-b border-border/60">
              <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prazos</p>
              {(dueSoon ?? []).map((v) => (
                <Link
                  key={v.id}
                  to="/workflow"
                  search={{ view: "fila", client: "all", video: v.id }}
                  className="flex items-start gap-2 px-3 py-2 text-xs transition hover:bg-muted/40"
                >
                  <CalendarClock
                    className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", v.due_date < todayISO() ? "text-destructive" : "text-[oklch(0.78_0.16_75)]")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{v.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {v.clients?.name ?? "—"} · {v.due_date < todayISO() ? "atrasado" : "vence"} {formatDate(v.due_date)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {(packageAlerts ?? []).length > 0 && (
            <div className="border-b border-border/60">
              <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pacotes próximos do limite</p>
              {(packageAlerts ?? []).map((item) => (
                <Link key={item.id} to="/clientes/$clientId" params={{ clientId: item.client_id }} className="flex items-start gap-2 px-3 py-2 text-xs transition hover:bg-muted/40">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.clients?.name ?? "Cliente"}</span><span className="block text-[11px] text-muted-foreground">Restam {Math.max(0, item.total_videos - item.videos_used)} de {item.total_videos} vídeos</span></span>
                </Link>
              ))}
            </div>
          )}

          {(rows ?? []).length === 0 && (dueSoon ?? []).length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">Nenhuma notificação. 🎉</p>
          ) : (
            (rows ?? []).map((n) => {
              const Icon = ICON[n.kind] ?? BellRing;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    openNotification(n);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-muted/40",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", n.read_at ? "text-muted-foreground" : "text-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{n.title}</span>
                    {n.body && <span className="block truncate text-[11px] text-muted-foreground">{n.body}</span>}
                    <span className="block text-[10px] text-muted-foreground">{relativeTime(n.created_at)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
