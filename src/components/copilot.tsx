import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Plus, Loader2, Wrench, Check, AlertCircle, Mic, Square, Volume2, VolumeX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useDock } from "@/lib/dock";
import { useVoice } from "@/hooks/use-voice";

const STORAGE_KEY = "alvesedt-copilot-messages";

export function CopilotButton() {
  const { isOpen, showLauncher, toggleDock, closeDock } = useDock();
  const open = isOpen("copilot");
  const [initial, setInitial] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const speakRef = useRef<(text: string) => void>(() => {});
  const qc = useQueryClient();
  const [orbHidden, setOrbHiddenState] = useState(false);
  useEffect(() => { setOrbHiddenState(localStorage.getItem("copilot-orb-hidden") === "1"); }, []);
  const setOrbHidden = (v: boolean) => { setOrbHiddenState(v); localStorage.setItem("copilot-orb-hidden", v ? "1" : "0"); };

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
      const text = message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join(" ");
      if (text) speakRef.current(text);
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages]);

  const handleTranscript = useCallback((text: string, final: boolean) => {
    setInput(text);
    if (final && text) setFinalTranscript(text);
  }, []);
  const voice = useVoice({ onTranscript: handleTranscript });
  speakRef.current = voice.speak;
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!finalTranscript || busy) return;
    sendMessage({ text: finalTranscript });
    setFinalTranscript("");
    setInput("");
  }, [finalTranscript, busy, sendMessage]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  function newConversation() {
    window.speechSynthesis?.cancel();
    setMessages([]);
    setInitial([]);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? toggleDock("copilot") : closeDock())}>
      {showLauncher && !orbHidden && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
          {(voice.listening || busy || input) && (
            <div className="max-w-xs truncate rounded-full border border-border bg-popover/80 px-3 py-1.5 text-xs text-foreground backdrop-blur-xl">
              {voice.listening ? (input || "Ouvindo…") : busy ? "Pensando…" : input}
            </div>
          )}
          <button
            onClick={() => { if (voice.supported && !busy) { voice.listening ? voice.stop() : voice.start(); } else toggleDock("copilot"); }}
            onContextMenu={(e) => { e.preventDefault(); toggleDock("copilot"); }}
            className={cn(
              "relative h-12 w-12 rounded-full border border-white/20 bg-[radial-gradient(circle_at_30%_30%,var(--primary-glow),var(--primary)_45%,var(--primary-deep))] shadow-[0_10px_40px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition duration-300 hover:scale-105 active:scale-95",
              voice.listening && "animate-pulse scale-110",
              busy && "animate-spin [animation-duration:3s]",
            )}
            aria-label="Falar com o copiloto"
            title="Clique para falar · botão direito abre a conversa"
          >
            <span className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_35%_25%,color-mix(in_oklab,var(--foreground)_55%,transparent),transparent_55%)]" />
          </button>
          <button onClick={() => toggleDock("copilot")} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground" aria-label="Abrir conversa"><Sparkles className="h-3.5 w-3.5" /></button>
          <button onClick={() => setOrbHidden(true)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground" aria-label="Ocultar bolinha"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {showLauncher && orbHidden && (
        <button onClick={() => setOrbHidden(false)} className="fixed bottom-3 left-1/2 z-40 h-1.5 w-10 -translate-x-1/2 rounded-full bg-primary/60 hover:bg-primary" aria-label="Mostrar copiloto" />
      )}
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
                  if (part.type === "reasoning" && part.text) {
                    return <details key={i} className="mb-2 text-[11px] text-muted-foreground"><summary className="cursor-pointer">Raciocínio</summary><p className="mt-1 whitespace-pre-wrap">{part.text}</p></details>;
                  }
                  if (part.type?.startsWith("tool-")) {
                    const name = part.type.slice(5);
                    const state = part.state;
                    if (name === "plan_video_batch" && state === "output-available" && part.output?.needs_confirmation) {
                      const plan = part.output.plan ?? [];
                      const first = plan[0] ?? {};
                      return (
                        <div key={i} className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                          <p className="font-semibold text-foreground">Confirmar nova leva</p>
                          <p className="mt-1 text-muted-foreground">{plan.length} vídeos · {part.output.brand ?? part.output.client} · {first.due_date ?? "sem data"}{first.due_time ? ` às ${String(first.due_time).slice(0, 5)}` : ""} · {first.status ?? "recebido"}</p>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" onClick={() => sendMessage({ text: `Confirmo a criação da leva ${part.output.batch_label ?? "planejada"}.` })} disabled={busy}><Check className="h-3.5 w-3.5" />Confirmar</Button>
                            <Button size="sm" variant="ghost" onClick={() => sendMessage({ text: "Cancelo essa criação." })} disabled={busy}><X className="h-3.5 w-3.5" />Cancelar</Button>
                          </div>
                        </div>
                      );
                    }
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
            {voice.supported && (
              <Button
                type="button"
                size="icon"
                variant={voice.listening ? "destructive" : "outline"}
                onClick={voice.listening ? voice.stop : voice.start}
                disabled={busy}
                title={voice.listening ? "Parar gravação" : "Falar com o copiloto"}
                aria-label={voice.listening ? "Parar gravação" : "Falar com o copiloto"}
              >
                {voice.listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)}
              title={voice.voiceEnabled ? "Silenciar respostas" : "Ativar respostas por voz"}
              aria-label={voice.voiceEnabled ? "Silenciar respostas" : "Ativar respostas por voz"}
            >
              {voice.voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button type="submit" size="icon" disabled={busy || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
