import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Plus, Loader2, Wrench, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const STORAGE_KEY = "cortex-copilot-messages";

export function CopilotButton() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const [token, setToken] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = new DefaultChatTransport({
    api: "/api/copilot",
    headers: () => (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>,
  });

  const { messages, sendMessage, status, setMessages } = useChat({
    messages: initial,
    transport,
    onFinish: ({ message }) => {
      // Invalidate caches when any tool ran
      const ranTool = message.parts.some((p: any) => p.type?.startsWith("tool-"));
      if (ranTool) {
        qc.invalidateQueries();
      }
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages]);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  function newConversation() {
    setMessages([]);
    setInitial([]);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-[0_10px_40px_-8px_oklch(0.72_0.19_235_/_0.7)] bg-gradient-to-br from-primary to-[oklch(0.55_0.22_260)]"
          aria-label="Copiloto"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Copiloto</SheetTitle>
            <Button variant="ghost" size="sm" onClick={newConversation} title="Nova conversa">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Peça ao copiloto:</p>
              <ul className="space-y-1">
                <li>• "Cria cliente Ana Silva plano 10 vídeos por Drive"</li>
                <li>• "Novo vídeo pra Bruna: bastidores festa"</li>
                <li>• "3 tarefas pra hoje: revisar contrato, ligar João, roteiro Instagram"</li>
                <li>• "Quantos vídeos em edição temos agora?"</li>
              </ul>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60",
              )}>
                {m.parts.map((part: any, i: number) => {
                  if (part.type === "text") {
                    return (
                      <div key={i} className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1">
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    );
                  }
                  if (part.type?.startsWith("tool-")) {
                    const name = part.type.slice(5);
                    const state = part.state;
                    return (
                      <div key={i} className="mt-1 flex items-center gap-1.5 text-[11px] opacity-80">
                        {state === "output-available" ? <Check className="h-3 w-3 text-[oklch(0.68_0.16_150)]" /> :
                         state === "output-error" ? <AlertCircle className="h-3 w-3 text-destructive" /> :
                         <Wrench className="h-3 w-3 animate-pulse" />}
                        <span className="font-mono">{name}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2">
              <div className="rounded-2xl bg-muted/60 px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Peça algo ao copiloto…"
              disabled={busy}
              autoFocus
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
