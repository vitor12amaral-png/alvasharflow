import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Kanban, ListOrdered, CheckSquare, Megaphone, UsersRound,
  Calendar, FolderOpen, Wallet, Settings, Sparkles, Video, Search,
} from "lucide-react";

const PAGES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/leads", label: "Leads", icon: Sparkles },
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

/** Busca universal (⌘K / Ctrl+K): páginas, clientes, vídeos e tarefas. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const term = q.trim();

  const { data } = useQuery({
    queryKey: ["command-search", term],
    enabled: open && term.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      const like = `%${term}%`;
      const [clients, videos, tasks, leads] = await Promise.all([
        supabase.from("clients").select("id, name").ilike("name", like).limit(6),
        supabase.from("videos").select("id, title, client_id, clients(name)").ilike("title", like).limit(6),
        supabase.from("tasks").select("id, title").ilike("title", like).limit(6),
        supabase.from("leads").select("id, name, company").ilike("name", like).limit(5),
      ]);
      return {
        clients: clients.data ?? [],
        videos: (videos.data ?? []) as { id: string; title: string; client_id: string; clients: { name: string } | null }[],
        tasks: tasks.data ?? [],
        leads: leads.data ?? [],
      };
    },
  });

  const pages = useMemo(
    () => PAGES.filter((p) => !term || p.label.toLowerCase().includes(term.toLowerCase())),
    [term],
  );

  function go(to: string) {
    setOpen(false);
    setQ("");
    navigate({ to } as never);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder="Buscar clientes, vídeos, tarefas ou páginas…"
      />
      <CommandList>
        <CommandEmpty>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" /> Nada encontrado.
          </span>
        </CommandEmpty>

        {pages.length > 0 && (
          <CommandGroup heading="Ir para">
            {pages.map((p) => (
              <CommandItem key={p.to} value={`pagina ${p.label}`} onSelect={() => go(p.to)}>
                <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.clients.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clientes">
              {data.clients.map((c) => (
                <CommandItem key={c.id} value={`cliente ${c.name}`} onSelect={() => go(`/clientes/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!!data?.videos.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Vídeos">
              {data.videos.map((v) => (
                <CommandItem key={v.id} value={`video ${v.title}`} onSelect={() => go("/workflow")}>
                  <Video className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{v.title}</span>
                  {v.clients?.name && (
                    <span className="ml-auto truncate text-[11px] text-muted-foreground">{v.clients.name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!!data?.tasks.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tarefas">
              {data.tasks.map((t) => (
                <CommandItem key={t.id} value={`tarefa ${t.title}`} onSelect={() => go("/tarefas")}>
                  <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!!data?.leads.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leads">
              {data.leads.map((l) => (
                <CommandItem key={l.id} value={`lead ${l.name}`} onSelect={() => go("/leads")}>
                  <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{l.name}</span>
                  {l.company && <span className="ml-auto truncate text-[11px] text-muted-foreground">{l.company}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
