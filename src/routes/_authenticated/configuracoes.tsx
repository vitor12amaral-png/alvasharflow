import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useBranding, useSaveBranding, THEME_PRESETS, DEFAULT_BRANDING } from "@/hooks/use-branding";
import { usePreferences } from "@/hooks/use-preferences";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Loader2, Copy, Link2, Trash2, Plus } from "lucide-react";
import { initials } from "@/lib/format";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
  head: () => ({
    meta: [
      { title: "Configurações — AlvasharFlow" },
      { name: "description", content: "Personalize marca, tema, acessibilidade, templates de projeto e onboarding automático." },
      { property: "og:title", content: "Configurações — AlvasharFlow" },
      { property: "og:description", content: "Marca, tema, acessibilidade, templates e onboarding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function randomToken() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

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
      <PageHeader title="Configurações" subtitle="Marca, aparência, acessibilidade, templates e onboarding" />

      <Tabs defaultValue="perfil" className="mt-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="marca">Marca &amp; tema</TabsTrigger>
          <TabsTrigger value="aparencia">Acessibilidade</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card className="p-6">
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
        </TabsContent>

        <TabsContent value="marca"><BrandingTab /></TabsContent>
        <TabsContent value="aparencia"><PrefsTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="onboarding"><OnboardingTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------------------------- marca --------------------------------- */

function BrandingTab() {
  const { data, isLoading } = useBranding();
  const save = useSaveBranding();
  const b = { ...DEFAULT_BRANDING, ...(data ?? {}) };
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const v = form ?? b;
  const set = (patch: Record<string, any>) => setForm({ ...v, ...patch });

  if (isLoading) return <Card className="p-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></Card>;

  return (
    <Card className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome da produtora</Label>
          <Input value={v.brand_name ?? ""} onChange={(e) => set({ brand_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Slogan</Label>
          <Input value={v.brand_tagline ?? ""} onChange={(e) => set({ brand_tagline: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>URL da logo</Label>
          <Input value={v.logo_url ?? ""} onChange={(e) => set({ logo_url: e.target.value })} placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label>Letra (quando não houver logo)</Label>
          <Input maxLength={2} value={v.logo_letter ?? ""} onChange={(e) => set({ logo_letter: e.target.value })} />
        </div>
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Paleta</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { set({ theme: p.theme, primary_color: p.primary }); sfx.select(); }}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition",
                v.primary_color === p.primary && v.theme === p.theme ? "border-primary" : "border-border hover:border-primary/50",
              )}
            >
              <span className="h-4 w-4 rounded-full" style={{ background: p.primary }} />
              {p.label}
              <span className="text-[10px] text-muted-foreground">{p.theme === "light" ? "claro" : "escuro"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Cor principal</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={v.primary_color ?? "#38b6ff"}
              onChange={(e) => set({ primary_color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent"
              aria-label="Cor principal"
            />
            <Input value={v.primary_color ?? ""} onChange={(e) => set({ primary_color: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp (com DDI)</Label>
          <Input value={v.whatsapp_number ?? ""} onChange={(e) => set({ whatsapp_number: e.target.value })} placeholder="5511999999999" />
        </div>
        <div className="space-y-1.5">
          <Label>Pasta do Google Drive</Label>
          <Input value={v.drive_folder_url ?? ""} onChange={(e) => set({ drive_folder_url: e.target.value })} placeholder="https://drive.google.com/…" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Alerta de pacote acabando (vídeos restantes)</Label>
          <Input
            type="number"
            min={0}
            value={v.package_alert_threshold ?? 2}
            onChange={(e) => set({ package_alert_threshold: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Pesquisa NPS pós-entrega</p>
            <p className="text-xs text-muted-foreground">Mostrada no portal do cliente após a entrega.</p>
          </div>
          <Switch checked={!!v.nps_enabled} onCheckedChange={(c) => set({ nps_enabled: c })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Mensagem de boas-vindas no portal</Label>
        <Textarea rows={3} value={v.portal_welcome ?? ""} onChange={(e) => set({ portal_welcome: e.target.value })} />
      </div>

      <div className="flex justify-end">
        <Button
          disabled={save.isPending}
          onClick={() => {
            const { workspace_id: _ignored, ...patch } = v as any;
            save.mutate(patch, {
              onSuccess: () => { sfx.success(); toast.success("Personalização salva"); },
              onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
            });
          }}
        >
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------ acessibilidade ----------------------------- */

function PrefsTab() {
  const { prefs, update } = usePreferences();
  return (
    <Card className="space-y-4 p-6">
      <Row title="Sons da interface" desc="Feedback sonoro suave em cliques, seleções e conclusões.">
        <Switch checked={prefs.sound} onCheckedChange={(c) => update({ sound: c })} />
      </Row>
      <div className="rounded-md border border-border px-3 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Volume</p>
          <span className="text-xs text-muted-foreground">{Math.round(prefs.volume * 100)}%</span>
        </div>
        <Slider
          className="mt-3"
          value={[prefs.volume * 100]}
          max={100}
          step={5}
          onValueChange={([n]) => update({ volume: (n ?? 0) / 100 })}
        />
      </div>
      <Row title="Reduzir animações" desc="Remove transições e movimentos para uma navegação mais estável.">
        <Switch checked={prefs.reduceMotion} onCheckedChange={(c) => update({ reduceMotion: c })} />
      </Row>
      <Row title="Alto contraste" desc="Aumenta o contraste de bordas e textos secundários.">
        <Switch checked={prefs.highContrast} onCheckedChange={(c) => update({ highContrast: c })} />
      </Row>
      <Row title="Interface compacta" desc="Mais informação por tela, com espaçamentos menores.">
        <Switch
          checked={prefs.density === "compacto"}
          onCheckedChange={(c) => update({ density: c ? "compacto" : "confortavel" })}
        />
      </Row>
    </Card>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------- templates -------------------------------- */

function TemplatesTab() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const workspaceId = me?.workspaceId ?? null;

  const list = useQuery({
    queryKey: ["project-templates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  const [titles, setTitles] = useState("");
  const [checklist, setChecklist] = useState("");
  const [dueInDays, setDueInDays] = useState("7");

  const create = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      if (!name.trim()) throw new Error("Dê um nome ao template");
      const { error } = await supabase.from("project_templates").insert({
        workspace_id: workspaceId,
        name: name.trim(),
        created_by: me?.id ?? null,
        due_in_days: Number(dueInDays) || null,
        titles: titles.split("\n").map((t) => t.trim()).filter(Boolean),
        checklist: checklist.split("\n").map((t) => t.trim()).filter(Boolean).map((label) => ({ label, done: false })),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      sfx.success();
      toast.success("Template criado");
      setName(""); setTitles(""); setChecklist("");
      qc.invalidateQueries({ queryKey: ["project-templates"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao criar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Template removido"); qc.invalidateQueries({ queryKey: ["project-templates"] }); },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-3 p-5">
        <p className="font-display text-sm font-semibold">Novo template</p>
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pacote Reels 10" />
        </div>
        <div className="space-y-1.5">
          <Label>Prazo padrão (dias)</Label>
          <Input type="number" min={0} value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Títulos dos vídeos (um por linha)</Label>
          <Textarea rows={5} value={titles} onChange={(e) => setTitles(e.target.value)} placeholder={"Reels 01\nReels 02"} />
        </div>
        <div className="space-y-1.5">
          <Label>Checklist padrão (um por linha)</Label>
          <Textarea rows={4} value={checklist} onChange={(e) => setChecklist(e.target.value)} placeholder={"Decupagem\nCorte bruto\nColor\nExport"} />
        </div>
        <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Criar template
        </Button>
      </Card>

      <Card className="p-5">
        <p className="font-display text-sm font-semibold">Templates salvos</p>
        {list.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (list.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhum template ainda.</p>
        ) : (
          <div className="mt-3 divide-y divide-border/60 rounded-md border border-border">
            {(list.data ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(t.titles?.length ?? 0)} vídeo(s) · {(t.checklist?.length ?? 0)} itens de checklist
                    {t.due_in_days ? ` · prazo ${t.due_in_days}d` : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => remove.mutate(t.id)} aria-label="Remover template">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------- onboarding ------------------------------- */

function OnboardingTab() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const workspaceId = me?.workspaceId ?? null;

  const tokens = useQuery({
    queryKey: ["onboarding-tokens", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_tokens")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const subs = useQuery({
    queryKey: ["onboarding-submissions", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_submissions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const gen = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { error } = await supabase.from("onboarding_tokens").insert({
        workspace_id: workspaceId,
        token: randomToken(),
        label: "Formulário de onboarding",
        created_by: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { sfx.success(); toast.success("Link gerado"); qc.invalidateQueries({ queryKey: ["onboarding-tokens"] }); },
    onError: (e: any) => toast.error(e.message ?? "Falha ao gerar"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("onboarding_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link revogado"); qc.invalidateQueries({ queryKey: ["onboarding-tokens"] }); },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm font-semibold">Links do formulário</p>
          <Button size="sm" className="ml-auto" onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1 h-3.5 w-3.5" />}Gerar link
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie para o cliente preencher os dados sozinho. As respostas aparecem abaixo.
        </p>
        <div className="mt-3 space-y-2">
          {(tokens.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum link ativo.</p>}
          {(tokens.data ?? []).map((t: any) => {
            const url = `${origin}/onboarding/${t.token}`;
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                <code className="max-w-[340px] truncate rounded bg-muted px-2 py-1 text-[11px]">{url}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => { navigator.clipboard.writeText(url); sfx.success(); toast.success("Link copiado"); }}
                >
                  <Copy className="mr-1 h-3 w-3" />Copiar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => revoke.mutate(t.id)} aria-label="Revogar link">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-display text-sm font-semibold">Respostas recebidas</p>
        {subs.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (subs.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma resposta ainda.</p>
        ) : (
          <div className="mt-3 divide-y divide-border/60 rounded-md border border-border">
            {(subs.data ?? []).map((s: any) => (
              <div key={s.id} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {s.company && <span className="text-xs text-muted-foreground">{s.company}</span>}
                  <Badge variant="outline" className="ml-auto text-[9px] uppercase">{s.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {[s.email, s.phone, s.instagram].filter(Boolean).join(" · ") || "Sem contato informado"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
