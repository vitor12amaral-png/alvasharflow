import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsappMessage } from "@/lib/whatsapp.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Plus, Send, Settings2, Search, Link2, BellRing } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPhone, normalizePhone, type WaConversation, type WaMessage } from "@/lib/whatsapp";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  component: WhatsappPage,
  head: () => ({
    meta: [
      { title: "WhatsApp — caixa de entrada por cliente | AlvasharFlow" },
      { name: "description", content: "Veja e responda conversas de WhatsApp de clientes e leads sem sair do painel de produção." },
      { property: "og:title", content: "WhatsApp — caixa de entrada por cliente | AlvasharFlow" },
      { property: "og:description", content: "Conversas de clientes e leads centralizadas no AlvasharFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function WhatsappPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const send = useServerFn(sendWhatsappMessage);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["wa-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as WaConversation[];
    },
    refetchInterval: 20_000,
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, whatsapp, phone").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["wa-messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", activeId!)
        .order("sent_at");
      if (error) throw error;
      return (data ?? []) as unknown as WaMessage[];
    },
    refetchInterval: 12_000,
  });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = conversations ?? [];
    if (!q) return all;
    return all.filter((c) =>
      [c.contact_name ?? "", c.wa_phone, c.last_message_preview ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const active = (conversations ?? []).find((c) => c.id === activeId) ?? null;
  const clientName = active?.client_id ? clients?.find((c) => c.id === active.client_id)?.name ?? null : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Zera o contador de não lidas ao abrir a conversa.
  useEffect(() => {
    if (!active || active.unread_count === 0) return;
    supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", active.id)
      .then(() => qc.invalidateQueries({ queryKey: ["wa-conversations"] }));
  }, [active?.id]);

  const sendMut = useMutation({
    mutationFn: async (text: string) => send({ data: { conversation_id: activeId!, body: text } }),
    onSuccess: (res: any) => {
      setDraft("");
      if (res?.warning) toast.warning(res.warning);
      qc.invalidateQueries({ queryKey: ["wa-messages", activeId] });
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="WhatsApp"
        subtitle="Conversas de clientes e leads em um só lugar."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAlertsOpen(true)}>
              <BellRing className="mr-1.5 h-4 w-4" /> Avisos
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="mr-1.5 h-4 w-4" /> Conexão
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Nova conversa
            </Button>
          </div>
        }
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa" className="h-9 pl-8" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
            )}
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors",
                  activeId === c.id ? "bg-muted/60" : "hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {c.contact_name || (c.client_id ? clients?.find((x) => x.id === c.client_id)?.name : null) || formatPhone(c.wa_phone)}
                  </span>
                  {c.unread_count > 0 && <Badge className="h-5 min-w-5 justify-center px-1 text-[10px]">{c.unread_count}</Badge>}
                </div>
                <span className="truncate text-[11px] text-muted-foreground">{c.last_message_preview ?? formatPhone(c.wa_phone)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex max-h-[70vh] min-h-[420px] flex-col overflow-hidden p-0">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageCircle className="h-6 w-6" />
              <p className="text-xs">Selecione uma conversa para ler e responder.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{active.contact_name || formatPhone(active.wa_phone)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatPhone(active.wa_phone)}
                    {clientName ? ` • ${clientName}` : ""}
                  </p>
                </div>
                <LinkClientSelect conversation={active} clients={clients ?? []} onDone={() => qc.invalidateQueries({ queryKey: ["wa-conversations"] })} />
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {(messages ?? []).map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "out" && "justify-end")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                        m.direction === "out" ? "bg-primary text-primary-foreground" : "bg-muted/60",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.body ?? `[${m.media_type ?? "mídia"}]`}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {new Date(m.sent_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {m.direction === "out" ? ` • ${m.status}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {(messages ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sem mensagens nesta conversa.</p>}
              </div>

              <form
                className="flex gap-2 border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim() || sendMut.isPending) return;
                  sendMut.mutate(draft.trim());
                }}
              >
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva uma resposta…" />
                <Button type="submit" size="icon" disabled={sendMut.isPending || !draft.trim()}>
                  {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        workspaceId={me?.workspaceId ?? null}
        clients={clients ?? []}
        onCreated={(id) => {
          setActiveId(id);
          qc.invalidateQueries({ queryKey: ["wa-conversations"] });
        }}
      />
      <ChannelDialog open={settingsOpen} onOpenChange={setSettingsOpen} workspaceId={me?.workspaceId ?? null} />
      <AlertPrefsDialog open={alertsOpen} onOpenChange={setAlertsOpen} workspaceId={me?.workspaceId ?? null} userId={me?.id ?? null} />
    </div>
  );
}

function LinkClientSelect({
  conversation, clients, onDone,
}: { conversation: WaConversation; clients: { id: string; name: string }[]; onDone: () => void }) {
  return (
    <Select
      value={conversation.client_id ?? "none"}
      onValueChange={async (v) => {
        const { error } = await supabase
          .from("whatsapp_conversations")
          .update({ client_id: v === "none" ? null : v })
          .eq("id", conversation.id);
        if (error) toast.error(error.message);
        else { toast.success("Conversa vinculada"); onDone(); }
      }}
    >
      <SelectTrigger className="h-8 w-[190px] text-xs">
        <Link2 className="mr-1.5 h-3.5 w-3.5" />
        <SelectValue placeholder="Vincular cliente" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem cliente</SelectItem>
        {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function NewConversationDialog({
  open, onOpenChange, workspaceId, clients, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string | null;
  clients: { id: string; name: string; whatsapp: string | null; phone: string | null }[];
  onCreated: (id: string) => void;
}) {
  const [clientId, setClientId] = useState("none");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!workspaceId) return;
    const waPhone = normalizePhone(phone);
    if (waPhone.length < 12) { toast.error("Informe um número válido com DDD"); return; }
    setSaving(true);
    const { data: existing } = await supabase
      .from("whatsapp_conversations").select("id").eq("wa_phone", waPhone).maybeSingle();
    if (existing) {
      setSaving(false); onOpenChange(false); onCreated(existing.id);
      return;
    }
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .insert({
        workspace_id: workspaceId,
        wa_phone: waPhone,
        contact_name: name || null,
        client_id: clientId === "none" ? null : clientId,
      })
      .select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onOpenChange(false);
    setPhone(""); setName(""); setClientId("none");
    onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente (opcional)</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                const c = clients.find((x) => x.id === v);
                if (c) { setPhone(c.whatsapp || c.phone || ""); setName(c.name); }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Número com DDD</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 91234-5678" />
          </div>
          <div>
            <Label>Nome do contato</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (v: boolean) => void; workspaceId: string | null }) {
  const qc = useQueryClient();
  const { data: channel } = useQuery({
    queryKey: ["wa-channel"],
    enabled: open && !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_channels").select("*").maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({ phone_number_id: "", access_token: "", verify_token: "", display_number: "", enabled: false });
  useEffect(() => {
    if (channel) {
      setForm({
        phone_number_id: channel.phone_number_id ?? "",
        access_token: channel.access_token ?? "",
        verify_token: channel.verify_token ?? "",
        display_number: channel.display_number ?? "",
        enabled: channel.enabled,
      });
    }
  }, [channel]);

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/whatsapp` : "";

  async function save() {
    if (!workspaceId) return;
    const { error } = await supabase.from("whatsapp_channels").upsert({ workspace_id: workspaceId, ...form });
    if (error) toast.error(error.message);
    else { toast.success("Conexão salva"); qc.invalidateQueries({ queryKey: ["wa-channel"] }); onOpenChange(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Conexão do WhatsApp</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Use a <strong>WhatsApp Cloud API da Meta</strong> — a API é gratuita e inclui uma cota mensal de conversas de atendimento sem custo.
            Crie um app em developers.facebook.com, pegue o <em>Phone Number ID</em> e o token, e cadastre o webhook abaixo.
          </p>
          <div>
            <Label>URL do webhook</Label>
            <Input readOnly value={webhookUrl} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div>
            <Label>Token de verificação (você escolhe)</Label>
            <Input value={form.verify_token} onChange={(e) => setForm((f) => ({ ...f, verify_token: e.target.value }))} placeholder="ex.: alvashar-2026" />
          </div>
          <div>
            <Label>Phone Number ID</Label>
            <Input value={form.phone_number_id} onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))} />
          </div>
          <div>
            <Label>Access token</Label>
            <Input type="password" value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} />
          </div>
          <div>
            <Label>Número exibido</Label>
            <Input value={form.display_number} onChange={(e) => setForm((f) => ({ ...f, display_number: e.target.value }))} placeholder="+55 11 91234-5678" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Envio ativo</p>
              <p className="text-[11px] text-muted-foreground">Desligado, as respostas ficam salvas como pendentes.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ALERT_FIELDS = [
  { key: "on_due_soon", label: "Prazo vencendo", hint: "Vídeos com entrega hoje ou amanhã." },
  { key: "on_video_approved", label: "Vídeo aprovado", hint: "Quando o cliente aprova." },
  { key: "on_video_delivered", label: "Vídeo entregue", hint: "Quando a entrega é marcada." },
  { key: "on_package_limit", label: "Pacote perto do limite", hint: "Levas chegando ao fim." },
  { key: "on_urgent_task", label: "Tarefa urgente", hint: "Tarefa urgente atribuída a você." },
] as const;

function AlertPrefsDialog({
  open, onOpenChange, workspaceId, userId,
}: { open: boolean; onOpenChange: (v: boolean) => void; workspaceId: string | null; userId: string | null }) {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ["wa-alert-prefs", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_alert_prefs").select("*").eq("user_id", userId!).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    phone: "", enabled: true,
    on_due_soon: true, on_video_approved: true, on_video_delivered: true,
    on_package_limit: true, on_urgent_task: true,
  });

  useEffect(() => {
    if (prefs) {
      setForm({
        phone: prefs.phone ?? "",
        enabled: prefs.enabled,
        on_due_soon: prefs.on_due_soon,
        on_video_approved: prefs.on_video_approved,
        on_video_delivered: prefs.on_video_delivered,
        on_package_limit: prefs.on_package_limit,
        on_urgent_task: prefs.on_urgent_task,
      });
    }
  }, [prefs]);

  async function save() {
    if (!workspaceId || !userId) return;
    const { error } = await supabase
      .from("whatsapp_alert_prefs")
      .upsert(
        { workspace_id: workspaceId, user_id: userId, ...form, phone: form.phone ? normalizePhone(form.phone) : null },
        { onConflict: "workspace_id,user_id" },
      );
    if (error) toast.error(error.message);
    else { toast.success("Avisos atualizados"); qc.invalidateQueries({ queryKey: ["wa-alert-prefs", userId] }); onOpenChange(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Meus avisos por WhatsApp</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Meu número (com DDD)</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(11) 91234-5678" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Os avisos só saem depois que a conexão da Cloud API estiver ativa.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <p className="text-sm font-medium">Receber avisos</p>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>
          <div className="space-y-1.5">
            {ALERT_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <p className="text-sm">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                </div>
                <Switch
                  checked={form[f.key]}
                  disabled={!form.enabled}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

