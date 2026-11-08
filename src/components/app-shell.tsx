import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Kanban, Calendar, FolderOpen,
  Wallet, Settings, UsersRound, LogOut, Loader2,
  CheckSquare, Megaphone, Volume2, VolumeX, Sparkles, MessageCircle,
  Wrench, ShieldCheck, ChevronDown,
} from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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
type NavGroup = { id: string; label: string; icon: typeof LayoutDashboard; items: NavItem[] };

const SOLO_TOP: NavItem[] = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

const NAV_GROUPS: NavGroup[] = [
  { id: "clientes", label: "Clientes", icon: Users, items: [
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/leads", label: "Leads", icon: Sparkles },
    { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  ] },
  { id: "trabalho", label: "Trabalho", icon: Kanban, items: [
    { to: "/workflow", label: "Workflow", icon: Kanban },
    { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  ] },
  { id: "conteudo", label: "Conteúdo", icon: Megaphone, items: [
    { to: "/marketing", label: "Marketing", icon: Megaphone },
    { to: "/calendario", label: "Calendário", icon: Calendar },
    { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen },
  ] },
  { id: "gestao", label: "Gestão", icon: Wallet, items: [
    { to: "/financeiro", label: "Financeiro", icon: Wallet },
    { to: "/equipe", label: "Equipe", icon: UsersRound },
    { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { to: "/contas", label: "Contas", icon: ShieldCheck, ownerOnly: true },
  ] },
];

const SOLO_BOTTOM: NavItem[] = [{ to: "/configuracoes", label: "Configurações", icon: Settings }];

const NAV = [...SOLO_TOP, ...NAV_GROUPS.flatMap((g) => g.items), ...SOLO_BOTTOM] as NavItem[];

/** Abas do topo no mesmo desenho da página de vendas: texto limpo, ícone fino, ponto de luz na ativa. */
function navLinkClass(active: boolean) {
  return cn(
    "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-200",
    active
      ? "font-medium text-foreground after:absolute after:-bottom-[7px] after:left-1/2 after:h-[3px] after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-[image:var(--gradient-cta)] after:shadow-[0_0_10px_var(--violet)]"
      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
  );
}

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
          ? "bg-foreground/[0.06] font-medium text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]"
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


const HoverCtx = createContext<{ enter: () => void; leave: () => void }>({ enter: () => {}, leave: () => {} });
function HoverMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const enter = () => { if (timer.current) window.clearTimeout(timer.current); setOpen(true); };
  const leave = () => { timer.current = window.setTimeout(() => setOpen(false), 140); };
  return (
    <div onPointerEnter={(e) => e.pointerType === "mouse" && enter()} onPointerLeave={(e) => e.pointerType === "mouse" && leave()}>
      <HoverCtx.Provider value={{ enter, leave }}>
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>{children}</DropdownMenu>
      </HoverCtx.Provider>
    </div>
  );
}
function HoverMenuPanel({ children }: { children: ReactNode }) {
  const { enter, leave } = useContext(HoverCtx);
  return (
    <DropdownMenuContent
      align="center"
      sideOffset={10}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onCloseAutoFocus={(e) => e.preventDefault()}
      className="min-w-56 rounded-2xl border-border/70 bg-landing-panel/95 p-1.5 backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
    >
      {children}
    </DropdownMenuContent>
  );
}
function HoverMenuTrigger({ children }: { children: ReactNode }) {
  return <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>;
}

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
      <div aria-hidden className="app-aurora" />
      {/* Barra superior em pílula de vidro, igual à da página de vendas */}
      <header className="sticky top-0 z-30 px-2 pt-3 md:px-6">
        <div className="glass-apple mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-full pr-2 pl-5 md:pl-6">
          <Link to="/workflow" className="flex shrink-0 items-center gap-2">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={`Logo ${brand.brand_name}`} className="h-7 w-7 rounded-md object-cover" />
            ) : null}
            <span className="font-display text-lg font-bold uppercase tracking-tight">{brand.brand_name}</span>
            <span className="h-2 w-2 rounded-full bg-primary" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" data-tour="nav">
            {SOLO_TOP.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navLinkClass(isActivePath(location.pathname, item.to))}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
            {visibleGroups.map((group) => {
              const hasActive = group.items.some((i) => isActivePath(location.pathname, i.to));
              return (
                <HoverMenu key={group.id}>
                  <HoverMenuTrigger>
                    <button data-tour={`nav-${group.id}`} className={navLinkClass(hasActive)}>
                      <group.icon className="h-3.5 w-3.5" />
                      {group.label}
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </HoverMenuTrigger>
                  <HoverMenuPanel>
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
                  </HoverMenuPanel>
                </HoverMenu>
              );
            })}
            {SOLO_BOTTOM.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navLinkClass(isActivePath(location.pathname, item.to))}
              >
                <item.icon className="h-3.5 w-3.5" />
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
                <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-[11px] font-semibold text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]" title={user.fullName ?? user.email ?? undefined}>
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
        <div className="rounded-[26px] border border-foreground/[0.08] bg-landing/90 p-1.5 app-frame-glow">
          <main className="min-h-[calc(100vh-8rem)] rounded-[20px] border border-foreground/[0.06] bg-landing">{children}</main>
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
