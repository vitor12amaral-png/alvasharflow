import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Kanban, Calendar, FolderOpen,
  Wallet, Settings, UsersRound, LogOut, Loader2,
  CheckSquare, Megaphone, ListOrdered,
} from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CopilotButton } from "@/components/copilot";
import { TimerBadge } from "@/components/timer";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/workflow", label: "Workflow", icon: Kanban },
  { to: "/fila", label: "Fila", icon: ListOrdered },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/equipe", label: "Equipe", icon: UsersRound },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/85 backdrop-blur md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[oklch(0.55_0.22_260)] shadow-[0_0_24px_-6px_oklch(0.72_0.19_235_/_0.7)]">
            <span className="font-display text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div>
            <p className="font-display text-sm leading-tight font-semibold">AlvasharFlow</p>
            <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Creators & editores</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.06)]"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2.5">
          <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials(user.fullName ?? user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.fullName ?? "Sem nome"}</p>
              <p className="truncate text-[10px] text-muted-foreground uppercase tracking-wider">{user.role}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[oklch(0.55_0.22_260)]">
              <span className="font-display text-[10px] font-bold text-primary-foreground">A</span>
            </div>
            <span className="font-display text-sm font-semibold">AlvasharFlow</span>
          </div>
          <button onClick={signOut} className="text-xs text-muted-foreground">Sair</button>
        </header>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around overflow-x-auto border-t border-border bg-sidebar/95 px-1 py-1.5 backdrop-blur md:hidden">
          {NAV.slice(0, 5).map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[9px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <TimerBadge />
      <CopilotButton />
    </div>
  );
}
