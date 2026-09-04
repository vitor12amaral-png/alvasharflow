import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Kanban, Calendar, FolderOpen,
  Wallet, Settings, UsersRound, LogOut, Loader2,
  CheckSquare, Megaphone, Volume2, VolumeX, Sparkles, MessageCircle,
  Wrench, ShieldCheck, ChevronDown,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CopilotButton } from "@/components/copilot";
import { installGlobalSfx } from "@/lib/sfx";
import { usePreferences } from "@/hooks/use-preferences";
import { useBranding, DEFAULT_BRANDING } from "@/hooks/use-branding";
import { PackageAlertsBell } from "@/components/package-alerts";
import { NotificationCenter } from "@/components/notification-center";
import { CommandPalette } from "@/components/command-palette";
import { useServerFn } from "@tanstack/react-start";
import { dispatchMyWhatsappAlerts } from "@/lib/whatsapp-alerts.functions";
import { amIPlatformOwner } from "@/lib/platform.functions";
import { TrialBanner, TrialExpired } from "@/components/trial-gate";
import { useQuery } from "@tanstack/react-query";


type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; ownerOnly?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

const SOLO_TOP: NavItem[] = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

const NAV_GROUPS: NavGroup[] = [
  { id: "clientes", label: "Clientes", items: [
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/leads", label: "Leads", icon: Sparkles },
    { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  ] },
  { id: "trabalho", label: "Trabalho", items: [
    { to: "/workflow", label: "Workflow", icon: Kanban },
    { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  ] },
  { id: "conteudo", label: "Conteúdo", items: [
    { to: "/marketing", label: "Marketing", icon: Megaphone },
    { to: "/calendario", label: "Calendário", icon: Calendar },
    { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen },
  ] },
  { id: "gestao", label: "Gestão", items: [
    { to: "/financeiro", label: "Financeiro", icon: Wallet },
    { to: "/equipe", label: "Equipe", icon: UsersRound },
    { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { to: "/contas", label: "Contas", icon: ShieldCheck, ownerOnly: true },
  ] },
];

const SOLO_BOTTOM: NavItem[] = [{ to: "/configuracoes", label: "Configurações", icon: Settings }];

const NAV = [...SOLO_TOP, ...NAV_GROUPS.flatMap((g) => g.items), ...SOLO_BOTTOM] as NavItem[];

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(to + "/");
}

function NavLinkRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.to);
  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] transition-all duration-200",
        active
          ? "bg-[linear-gradient(180deg,oklch(1_0_0_/_0.09),oklch(1_0_0_/_0.03))] text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.08),0_6px_18px_-12px_oklch(0_0_0)]"
          : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground",
      )}
    >
      <span className={cn(
        "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary transition-opacity duration-200",
        active ? "opacity-100 shadow-[0_0_10px_var(--primary)]" : "opacity-0",
      )} />
      <item.icon className={cn("h-[15px] w-[15px] transition-colors", active ? "text-primary" : "group-hover:text-foreground")} />
      <span className="font-medium">{item.label}</span>
    </Link>
  );
}

const GROUPS_KEY = "af-nav-groups";




export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { prefs, update } = usePreferences();
  const { data: branding } = useBranding();
  const brand = branding ?? DEFAULT_BRANDING;

  useEffect(() => installGlobalSfx(), []);

  const [openGroups, setOpenGroupsState] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      if (raw) setOpenGroupsState(JSON.parse(raw) as Record<string, boolean>);
    } catch { /* ignore */ }
  }, []);
  function setOpenGroups(next: Record<string, boolean>) {
    setOpenGroupsState(next);
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }


  // Dispara avisos pendentes por WhatsApp (respeita as preferências do usuário).
  const dispatchAlerts = useServerFn(dispatchMyWhatsappAlerts);
  useEffect(() => {
    if (!user) return;
    const run = () => { void dispatchAlerts({}).catch(() => {}); };
    run();
    const id = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Painel de contas aparece só para o dono da plataforma.
  const checkOwner = useServerFn(amIPlatformOwner);
  const { data: ownerCheck } = useQuery({
    queryKey: ["platform-owner"],
    queryFn: () => checkOwner({}),
    enabled: !!user,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const isPlatformOwner = Boolean((ownerCheck as { owner?: boolean } | undefined)?.owner);

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

  // Teste vencido/conta suspensa: aviso claro no lugar de telas vazias.
  if (!user.isActive) return <TrialExpired user={user} onSignOut={signOut} />;


  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/60 backdrop-blur-2xl md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={`Logo ${brand.brand_name}`} className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[oklch(0.55_0.22_260)] shadow-[0_0_24px_-6px_var(--primary)]">
              <span className="font-display text-sm font-bold text-primary-foreground">{brand.logo_letter || brand.brand_name.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm leading-tight font-semibold">{brand.brand_name}</p>
            <p className="truncate text-[9px] tracking-[0.18em] text-muted-foreground uppercase">{brand.brand_tagline ?? ""}</p>
          </div>
        </div>


        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-2">
          {SOLO_TOP.map((item) => <NavLinkRow key={item.to} item={item} pathname={location.pathname} />)}
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.ownerOnly || isPlatformOwner);
            if (!items.length) return null;
            const hasActive = items.some((i) => isActivePath(location.pathname, i.to));
            const open = openGroups[group.id] ?? true;
            const expanded = open || hasActive;
            return (
              <div key={group.id} className="pt-1">
                <button
                  onClick={() => setOpenGroups({ ...openGroups, [group.id]: !expanded })}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 hover:text-foreground"
                >
                  {group.label}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", expanded ? "" : "-rotate-90")} />
                </button>
                {expanded && (
                  <div className="mt-0.5 space-y-[3px]">
                    {items.map((item) => <NavLinkRow key={item.to} item={item} pathname={location.pathname} />)}
                  </div>
                )}
              </div>
            );
          })}
          <div className="pt-2">
            {SOLO_BOTTOM.map((item) => <NavLinkRow key={item.to} item={item} pathname={location.pathname} />)}
          </div>
        </nav>


        <div className="border-t border-sidebar-border p-2.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/25 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials(user.fullName ?? user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.fullName ?? "Sem nome"}</p>
              <p className="truncate text-[10px] text-muted-foreground uppercase tracking-wider">{user.role}</p>
            </div>
            <NotificationCenter />
            <PackageAlertsBell threshold={brand.package_alert_threshold} />
            <button
              onClick={() => update({ sound: !prefs.sound })}
              data-sfx="off"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              title={prefs.sound ? "Desativar sons" : "Ativar sons"}
            >
              {prefs.sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

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

        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around overflow-x-auto border-t border-border bg-sidebar/80 px-1 py-1.5 backdrop-blur-2xl md:hidden">
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
      
      <CommandPalette />
      <CopilotButton />
    </div>
  );
}
