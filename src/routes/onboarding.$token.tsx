import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/$token")({
  ssr: false,
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Onboarding — AlvasharFlow" },
      { name: "description", content: "Preencha seus dados para iniciarmos sua produção de vídeos." },
      { property: "og:title", content: "Onboarding do cliente" },
      { property: "og:description", content: "Preencha seus dados para iniciarmos sua produção de vídeos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function OnboardingPage() {
  const { token } = Route.useParams();
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "", company: "", email: "", phone: "", instagram: "",
    objetivo: "", referencias: "", frequencia: "", observacoes: "",
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  const info = useQuery({
    queryKey: ["onboarding-info", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("onboarding_info", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Informe seu nome");
    setSaving(true);
    const { error } = await supabase.rpc("onboarding_submit", {
      _token: token,
      _name: f.name,
      _company: f.company,
      _email: f.email,
      _phone: f.phone,
      _instagram: f.instagram,
      _payload: {
        objetivo: f.objetivo,
        referencias: f.referencias,
        frequencia: f.frequencia,
        observacoes: f.observacoes,
      },
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setDone(true);
  }

  if (info.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!info.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Peça um novo link para a produtora.</p>
        </Card>
      </div>
    );
  }

  const brand = info.data;

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 font-display text-xl font-semibold">Recebemos suas informações!</h1>
          <p className="mt-2 text-sm text-muted-foreground">A equipe da {brand.brand_name} entrará em contato em breve.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        {brand.logo_url ? (
          <img src={brand.logo_url} alt={`Logo ${brand.brand_name}`} className="mx-auto h-12 w-12 rounded-xl object-cover" />
        ) : null}
        <h1 className="mt-3 font-display text-2xl font-semibold">{brand.brand_name}</h1>
        {brand.brand_tagline && <p className="text-sm text-muted-foreground">{brand.brand_tagline}</p>}
        <p className="mt-3 text-sm text-muted-foreground">Preencha o formulário para começarmos sua produção.</p>
      </header>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Seu nome *"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} required /></Field>
            <Field label="Empresa / marca"><Input value={f.company} onChange={(e) => set({ company: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="Instagram"><Input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@perfil" /></Field>
            <Field label="Frequência desejada"><Input value={f.frequencia} onChange={(e) => set({ frequencia: e.target.value })} placeholder="Ex: 10 vídeos/mês" /></Field>
          </div>
          <Field label="Objetivo do conteúdo">
            <Textarea rows={3} value={f.objetivo} onChange={(e) => set({ objetivo: e.target.value })} />
          </Field>
          <Field label="Referências (links)">
            <Textarea rows={3} value={f.referencias} onChange={(e) => set({ referencias: e.target.value })} />
          </Field>
          <Field label="Observações">
            <Textarea rows={3} value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} />
          </Field>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
