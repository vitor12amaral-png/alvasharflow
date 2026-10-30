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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; ownerOnly?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

const SOLO_TOP: NavItem[] = [
];

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

function NavLinkRow({ item, pathname, suppressActive = false, onSelect }: { item: NavItem; pathname: string; suppressActive?: boolean; onSelect?: () => void }) {
  const active = !suppressActive && isActivePath(pathname, item.to);
  return (
    <Link
      to={item.to}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] transition-colors duration-150",
        active
          ? "bg-primary/10 font-medium text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_22%,transparent),0_0_20px_-10px_var(--primary)]"
          : "text-foreground/90 hover:bg-sidebar-accent/55 hover:text-foreground",
      )}
    >
      <span className={cn(
        "absolute left-0 top-1/2 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-150",
        active ? "h-4 opacity-100" : "h-2 opacity-0",
      )} />
      <item.icon className={cn("h-[16px] w-[16px] transition-colors", active ? "text-primary" : "group-hover:text-sidebar-foreground")} />
      <span>{item.label}</span>
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
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
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
  function toggleGroup(id: string, activeInGroup: boolean) {
    const isOpen = openGroups[id] ?? activeInGroup;
    if (isOpen) {
      setOpenGroups({ ...openGroups, [id]: false });
      setSelectedGroup(null);
    } else {
      // exclusivo: fecha todos os outros
      const next: Record<string, boolean> = {};
      NAV_GROUPS.forEach((g) => { next[g.id] = g.id === id; });
      setOpenGroups(next);
      setSelectedGroup(id);
    }
  }
  // Garante que o grupo do item ativo fique aberto, sem permitir múltiplos abertos manualmente.
  useEffect(() => {
    setSelectedGroup(null);
    const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => isActivePath(location.pathname, i.to)));
    if (!activeGroup) return;
    if (openGroups[activeGroup.id]) return;
    const next: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => { next[g.id] = g.id === activeGroup.id; });
    setOpenGroups(next);
  }, [location.pathname]);

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

  const visibleGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.ownerOnly || isPlatformOwner) }))
    .filter((g) => g.items.length);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-landing">
      {/* Atmosfera da landing: arco de horizonte + feixe de luz */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_40%,transparent)]">
        <div className="absolute left-1/2 top-[140px] aspect-square w-[min(1400px,160vw)] -translate-x-1/2 rounded-full p-[1.5px] opacity-70 [background:var(--gradient-rim)] shadow-[0_-30px_140px_-20px_var(--primary-glow)]">
          <div className="h-full w-full rounded-full bg-landing" />
        </div>
        <div className="absolute left-1/2 top-[120px] h-40 w-[50%] -translate-x-1/2 rounded-[50%] bg-primary/15 blur-3xl" />
      </div>
      <div aria-hidden className="pointer-events-none fixed -top-20 left-[12%] z-0 h-[520px] w-40 -rotate-[28deg] bg-gradient-to-b from-foreground/[0.05] to-transparent blur-2xl" />

      {/* Barra superior no estilo do mockup */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-landing/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/workflow" className="flex shrink-0 items-center gap-2">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={`Logo ${brand.brand_name}`} className="h-7 w-7 rounded-md object-cover" />
            ) : null}
            <span className="font-display text-lg font-bold uppercase tracking-tight">{brand.brand_name}</span>
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-landing-panel/60 p-1 lg:flex">
            {visibleGroups.map((group) => {
              const hasActive = group.items.some((i) => isActivePath(location.pathname, i.to));
              return (
                <DropdownMenu key={group.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1 rounded-full px-4 py-1.5 text-[13px] transition-colors",
                        hasActive
                          ? "bg-primary/15 font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent),0_0_18px_-6px_var(--primary)]"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {group.label}
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" sideOffset={10} className="min-w-52 rounded-2xl border-border/70 bg-landing-panel/95 p-1.5 backdrop-blur-xl">
                    {group.items.map((item) => {
                      const active = isActivePath(location.pathname, item.to);
                      return (
                        <DropdownMenuItem key={item.to} asChild className="rounded-xl">
                          <Link to={item.to} className={cn("flex items-center gap-2.5 px-3 py-2", active && "bg-primary/10 text-primary")}>
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
            {SOLO_BOTTOM.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] transition-colors",
                  isActivePath(location.pathname, item.to) ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <NotificationCenter />
            <PackageAlertsBell threshold={brand.package_alert_threshold} />
            <button
              onClick={() => update({ sound: !prefs.sound })}
              data-sfx="off"
              className="rounded-full p-2 text-muted-foreground hover:bg-landing-panel hover:text-foreground"
              title={prefs.sound ? "Desativar sons" : "Ativar sons"}
            >
              {prefs.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-arctic text-[11px] font-semibold text-primary-foreground shadow-[0_0_18px_-4px_var(--primary)]" title={user.fullName ?? user.email}>
                  {initials(user.fullName ?? user.email)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="min-w-56 rounded-2xl border-border/70 bg-landing-panel/95 p-1.5 backdrop-blur-xl">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{user.fullName ?? "Sem nome"}</p>
                  <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{user.role}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/configuracoes" className="flex items-center gap-2.5 px-3 py-2"><Settings className="h-4 w-4" /> Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2.5 rounded-xl px-3 py-2">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Moldura de vidro, igual ao mockup da landing */}
      <div className="relative z-10 mx-auto max-w-7xl px-2 pb-24 pt-6 md:px-6 md:pb-10">
        <div className="rounded-3xl border border-border/70 bg-landing-panel/80 p-1.5 shadow-[0_50px_140px_-40px_oklch(0_0_0/0.9)] backdrop-blur-xl">
          <main className="min-h-[calc(100vh-8rem)] rounded-[1.25rem] border border-border/60 bg-landing/80">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around overflow-x-auto border-t border-border/60 bg-landing/85 px-1 py-1.5 backdrop-blur-2xl lg:hidden">
        {NAV.filter((i) => !i.ownerOnly || isPlatformOwner).map((item) => {
          const active = isActivePath(location.pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] transition-all",
                active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <CommandPalette />
      <CopilotButton />
    </div>
  );
}
