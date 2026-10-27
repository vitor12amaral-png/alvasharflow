import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateHooks } from "@/lib/hooks.functions";
import { formatBRL } from "@/lib/format";

/* ---------- Contratos ---------- */
export function ContractGenerator() {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => ((await supabase.from("clients").select("id, name, parent_client_id").order("name")).data ?? []) as { id: string; name: string }[],
  });
  const [kind, setKind] = useState<"mensal" | "avulso">("mensal");
  const [f, setF] = useState({ cliente: "", doc: "", agencia: "", valor: "", videos: "10", revisoes: "2", prazoBruto: "3", multa: "20", inicio: new Date().toISOString().slice(0, 10) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const text = useMemo(() => {
    const data = new Date(f.inicio + "T12:00").toLocaleDateString("pt-BR");
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE EDIÇÃO DE VÍDEO ${kind === "mensal" ? "(PACOTE MENSAL RECORRENTE)" : "(SERVIÇO AVULSO)"}

CONTRATANTE: ${f.cliente || "[nome do cliente]"}, inscrito(a) sob CPF/CNPJ ${f.doc || "[documento]"}.
CONTRATADA: ${f.agencia || "[nome da agência]"}.

1. OBJETO
A CONTRATADA prestará serviços de edição de ${f.videos} vídeo(s)${kind === "mensal" ? " por mês" : ""}, conforme briefing enviado pelo CONTRATANTE.

2. VALOR E PAGAMENTO
O CONTRATANTE pagará R$ ${f.valor || "[valor]"}${kind === "mensal" ? " mensalmente, até o 5º dia útil de cada mês" : ", sendo 50% na aprovação e 50% na entrega"}.

3. ALTERAÇÕES
Estão incluídas até ${f.revisoes} rodada(s) de alteração por vídeo. Alterações extras serão cobradas à parte.

4. MATERIAL BRUTO
O CONTRATANTE enviará o material bruto com no mínimo ${f.prazoBruto} dia(s) úteis de antecedência do prazo de entrega. Atrasos no envio prorrogam o prazo na mesma proporção.

5. DIREITOS E USO DE IMAGEM
Após a quitação, os direitos de uso dos vídeos finais pertencem ao CONTRATANTE. A CONTRATADA poderá exibir os trabalhos em seu portfólio, salvo pedido contrário por escrito.

6. VIGÊNCIA E RESCISÃO
${kind === "mensal" ? `Vigência a partir de ${data}, renovada automaticamente a cada mês. Qualquer parte pode rescindir com aviso prévio de 30 dias. Rescisão sem aviso implica multa de ${f.multa}% do valor mensal.` : `Vigência a partir de ${data} até a entrega final. Cancelamento após o início implica multa de ${f.multa}% do valor total.`}

7. FORO
As partes elegem o foro da comarca da CONTRATADA.

________________________________          ________________________________
CONTRATANTE                                         CONTRATADA

${data}`;
  }, [f, kind]);

  function downloadPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Contrato</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.6;white-space:pre-wrap;font-size:13px}</style></head><body>${text.replace(/</g, "&lt;")}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="space-y-3 p-4">
        <div><Label>Modelo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mensal">Pacote mensal</SelectItem><SelectItem value="avulso">Edição avulsa</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Cliente</Label>
          <Select value="" onValueChange={(id) => setF({ ...f, cliente: clients.find((c) => c.id === id)?.name ?? "" })}>
            <SelectTrigger><SelectValue placeholder={f.cliente || "Escolher cliente"} /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>CPF/CNPJ</Label><Input value={f.doc} onChange={set("doc")} /></div>
        <div><Label>Sua agência</Label><Input value={f.agencia} onChange={set("agencia")} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Valor (R$)</Label><Input value={f.valor} onChange={set("valor")} /></div>
          <div><Label>Vídeos</Label><Input value={f.videos} onChange={set("videos")} /></div>
          <div><Label>Alterações</Label><Input value={f.revisoes} onChange={set("revisoes")} /></div>
          <div><Label>Dias p/ bruto</Label><Input value={f.prazoBruto} onChange={set("prazoBruto")} /></div>
          <div><Label>Multa (%)</Label><Input value={f.multa} onChange={set("multa")} /></div>
          <div><Label>Início</Label><Input type="date" value={f.inicio} onChange={set("inicio")} /></div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="mb-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(text); toast.success("Contrato copiado"); }}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
          <Button size="sm" onClick={downloadPdf}><Download className="mr-1 h-4 w-4" />Baixar PDF</Button>
        </div>
        <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</pre>
      </Card>
    </div>
  );
}

/* ---------- Calculadora ---------- */
export function PriceCalculator() {
  const [hourly, setHourly] = useState(40);
  const [hours, setHours] = useState(2);
  const [videos, setVideos] = useState(10);
  const [fixed, setFixed] = useState(300);
  const [margin, setMargin] = useState(40);
  const cost = hourly * hours + fixed / Math.max(1, videos);
  const price = cost / Math.max(0.01, 1 - margin / 100);
  const pkg = price * videos;
  const profit = pkg - cost * videos;
  const field = (label: string, v: number, s: (n: number) => void) => (
    <div><Label>{label}</Label><Input type="number" value={v} onChange={(e) => s(Number(e.target.value) || 0)} /></div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="grid grid-cols-2 gap-3 p-4">
        {field("Custo/hora do editor (R$)", hourly, setHourly)}
        {field("Horas por vídeo", hours, setHours)}
        {field("Vídeos no pacote", videos, setVideos)}
        {field("Despesas fixas do mês (R$)", fixed, setFixed)}
        {field("Margem desejada (%)", margin, setMargin)}
      </Card>
      <Card className="space-y-4 p-5">
        <Row label="Custo por vídeo" value={formatBRL(cost)} />
        <Row label="Preço sugerido por vídeo" value={formatBRL(price)} big />
        <Row label="Preço do pacote" value={formatBRL(pkg)} big />
        <Row label="Lucro líquido no pacote" value={formatBRL(profit)} />
      </Card>
    </div>
  );
}
function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return <div className="flex items-baseline justify-between border-b border-border/60 pb-2"><span className="text-sm text-muted-foreground">{label}</span><span className={big ? "font-display text-2xl font-semibold" : "font-medium"}>{value}</span></div>;
}

/* ---------- Ganchos IA ---------- */
export function HookGenerator() {
  const gen = useServerFn(generateHooks);
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [hooks, setHooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (topic.trim().length < 2) return;
    setLoading(true);
    try {
      const r = await gen({ data: { topic, niche: niche || undefined } });
      if (r.error) toast.error(r.error); else setHooks(r.hooks);
    } catch { toast.error("Não foi possível gerar agora."); }
    setLoading(false);
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <div><Label>Tema do vídeo</Label><Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: 3 erros que fazem seu treino não render" /></div>
        <div><Label>Nicho (opcional)</Label><Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Fitness, imobiliário…" /></div>
        <Button onClick={run} disabled={loading}>{loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}Gerar 5 ganchos</Button>
      </Card>
      <Card className="space-y-2 p-4">
        {hooks.length === 0 ? <p className="text-sm text-muted-foreground">Os ganchos aparecem aqui.</p> : hooks.map((h, i) => (
          <button key={i} onClick={() => { navigator.clipboard.writeText(h); toast.success("Copiado"); }} className="block w-full rounded-lg border border-border p-3 text-left text-sm hover:border-primary/60">{h}</button>
        ))}
      </Card>
    </div>
  );
}

/* ---------- Checklist CQ ---------- */
const QC_ITEMS = [
  "Áudio normalizado em -14 LUFS",
  "Sem picos ou estouros de áudio",
  "Legendas revisadas (ortografia e sincronia)",
  "Texto e rostos dentro da zona segura do Instagram/TikTok",
  "Resolução e proporção corretas (1080×1920 / 9:16)",
  "Cores consistentes entre cortes",
  "Logo, CTA e trilha aprovados pelo cliente",
  "Nome do arquivo no padrão da entrega",
];
export function QualityChecklist() {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const count = Object.values(done).filter(Boolean).length;
  return (
    <Card className="max-w-xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display font-semibold">Checklist pré-entrega</p>
        <span className="text-sm text-muted-foreground">{count}/{QC_ITEMS.length}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(count / QC_ITEMS.length) * 100}%` }} /></div>
      <div className="space-y-2">
        {QC_ITEMS.map((item, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
            <Checkbox checked={!!done[i]} onCheckedChange={(v) => setDone({ ...done, [i]: !!v })} />{item}
          </label>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setDone({})}>Recomeçar</Button>
    </Card>
  );
}
