import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 20 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
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

        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > MAX_BYTES) return new Response("Áudio muito grande", { status: 413 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) return new Response("Áudio inválido", { status: 400 });

        const out = new FormData();
        out.append("model", "openai/gpt-transcribe");
        out.append("file", file, file.name || "audio.webm");
        out.append("response_format", "json");
        out.append("language", "pt");
        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: out,
        });
        return new Response(res.body, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
      },
    },
  },
});
