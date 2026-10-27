import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const generateHooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ topic: z.string().min(2).max(500), niche: z.string().max(120).optional() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { hooks: [] as string[], error: "IA não configurada." };
    const { streamText } = await import("ai");
    const { createLovableResponsesProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableResponsesProvider(key);
    try {
      const result = streamText({
        model: gateway.responses("openai/gpt-6-astra"),
        system: "Você cria ganchos de retenção (primeiros 3 segundos) para Reels/TikTok em português brasileiro. Responda apenas com 5 linhas, um gancho por linha, sem numeração, cada um com no máximo 15 palavras.",
        prompt: `Tema: ${data.topic}${data.niche ? `\nNicho: ${data.niche}` : ""}`,
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      });
      const text = await result.text;
      const hooks = text.split("\n").map((l) => l.replace(/^[\s\-•\d.)]+/, "").trim()).filter(Boolean).slice(0, 5);
      return { hooks, error: null as string | null };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      return { hooks: [] as string[], error: status === 402 ? "Créditos de IA esgotados." : status === 429 ? "Muitas solicitações, tente em instantes." : "Não foi possível gerar agora." };
    }
  });
