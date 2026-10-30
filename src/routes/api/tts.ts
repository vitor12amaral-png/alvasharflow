import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
const TTS_VOICE = "Achird";
// Style steering for Gemini TTS: the model follows it as direction and does not read it aloud.
const STYLE = "Fale em português do Brasil, com voz natural, calorosa e ágil, como uma assistente simpática conversando: ";

const Body = z.object({ text: z.string().trim().min(1).max(1200) });

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: u, error } = await supabase.auth.getUser(token);
        if (error || !u.user) return new Response("Unauthorized", { status: 401 });

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Texto inválido", { status: 400 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: TTS_MODEL,
            contents: [{ role: "user", parts: [{ text: STYLE + parsed.data.text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
            },
            stream_format: "sse",
          }),
          signal: request.signal,
        });
        if (!upstream.ok || !upstream.body) {
          return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "text/plain" } });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
