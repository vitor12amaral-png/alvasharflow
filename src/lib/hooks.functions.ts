import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  topic: z.string().trim().min(2).max(500),
  niche: z.string().trim().max(120).optional(),
  platform: z.enum(["reels", "tiktok", "shorts", "youtube"]).default("reels"),
  tone: z.enum(["direto", "curioso", "polêmico", "emocional", "educativo"]).default("direto"),
  count: z.number().int().min(3).max(10).default(6),
});

const PLATFORM: Record<z.infer<typeof Input>["platform"], string> = {
  reels: "Instagram Reels",
  tiktok: "TikTok",
  shorts: "YouTube Shorts",
  youtube: "abertura de vídeo longo no YouTube",
};

export type Hook = { kind: string; text: string };

export const generateHooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { hooks: [] as Hook[], error: "IA não configurada." };
    const { streamText } = await import("ai");
    const { createLovableResponsesProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableResponsesProvider(key);
    try {
      const result = streamText({
        model: gateway.responses("openai/gpt-6-astra"),
        system: `Você é roteirista de vídeos curtos e cria ganchos de retenção para os primeiros 3 segundos, em português brasileiro natural.
Regras:
- Gere exatamente ${data.count} ganchos para ${PLATFORM[data.platform]}, tom ${data.tone}.
- Varie a técnica: pergunta, promessa, quebra de expectativa, erro comum, número/lista, história, contraste.
- Cada gancho com no máximo 16 palavras, falável em voz alta, sem hashtags e sem emojis.
- Formato de cada linha, sem numeração: Técnica — texto do gancho`,
        prompt: `Tema: ${data.topic}${data.niche ? `\nNicho: ${data.niche}` : ""}`,
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      });
      const text = await result.text;
      const hooks: Hook[] = text
        .split("\n")
        .map((l) => l.replace(/^[\s\-•*\d.)]+/, "").trim())
        .filter(Boolean)
        .map((l) => {
          const m = l.match(/^(.{2,30}?)\s+[—–-]\s+(.+)$/);
          return m ? { kind: m[1].replace(/[*:]/g, "").trim(), text: m[2].trim() } : { kind: "Gancho", text: l };
        })
        .slice(0, data.count);
      if (!hooks.length) return { hooks, error: "A IA não retornou ganchos. Tente outro tema." };
      return { hooks, error: null as string | null };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      return { hooks: [] as Hook[], error: status === 402 ? "Créditos de IA esgotados." : status === 429 ? "Muitas solicitações, tente em instantes." : "Não foi possível gerar agora." };
    }
  });
