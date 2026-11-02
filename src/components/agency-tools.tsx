import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Segmented } from "@/components/segmented";
import { StatCard, EmptyState } from "@/components/stat-card";
import { Copy, Printer, Loader2, Sparkles, RotateCcw, Plus, X, CheckCircle2, AlertTriangle, Wand2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { generateHooks, type Hook } from "@/lib/hooks.functions";
import { formatBRL } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { priceFor, packageTable, type PriceInputs } from "@/lib/price-calculator";

/* ---------- utilidades ---------- */

function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setValue({ ...initial, ...JSON.parse(raw) }); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (v: T) => { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };
  return [value, update] as const;
}

function copyText(text: string, msg: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(msg), () => toast.error("Não consegui copiar. Selecione o texto manualmente."));
}

/** Imprime/gera PDF numa moldura oculta da própria página (popups são bloqueados em muitos navegadores). */
function printDocument(title: string, body: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const esc = body.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:22mm}body{font-family:Georgia,'Times New Roman',serif;color:#111;line-height:1.65;font-size:12.5pt;white-space:pre-wrap}</style></head><body>${esc}</body></html>`);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 150);
}

function onlyDigits(v: string) { return v.replace(/\D/g, ""); }
function formatDoc(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function parseMoney(v: string) { const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function valorPorExtensoSimples(n: number) { return n > 0 ? formatBRL(n) : "[valor]"; }

/* ---------- Contratos ---------- */

type ClientOpt = { id: string; name: string; company: string | null; email: string | null; price_per_video: number | null; client_packages: { status: string; price: number | null; total_videos: number | null; payment_day: number | null }[] | null };

export function ContractGenerator() {
  const { data: me } = useCurrentUser();
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-contract"],
    queryFn: async () => ((await supabase.from("clients").select("id, name, company, email, price_per_video, client_packages(status, price, total_videos, payment_day)").order("name")).data ?? []) as ClientOpt[],
  });
  const { data: brand } = useQuery({
    queryKey: ["ws-brand-name", me?.workspaceId],
    enabled: !!me?.workspaceId,
    queryFn: async () => (await supabase.from("workspace_settings").select("brand_name").eq("workspace_id", me!.workspaceId!).maybeSingle()).data?.brand_name ?? null,
  });

  const [kind, setKind] = useState<"mensal" | "avulso">("mensal");
  const [clientId, setClientId] = useState("");
  const [agency, setAgency] = usePersistent("tools-contract-agency", { agencia: "", agenciaDoc: "", cidade: "" });
  const [f, setF] = useState({ cliente: "", doc: "", valor: "", videos: "10", revisoes: "2", prazoBruto: "3", prazoEntrega: "5", pagamentoDia: "5", multa: "20", inicio: new Date().toISOString().slice(0, 10) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { if (!agency.agencia && brand) setAgency({ ...agency, agencia: brand }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [brand]);

  function chooseClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    const pack = c.client_packages?.find((p) => p.status === "ativo");
    setF((prev) => ({
      ...prev,
      cliente: c.company ? `${c.name} (${c.company})` : c.name,
      valor: pack?.price ? String(pack.price).replace(".", ",") : c.price_per_video ? String(Number(c.price_per_video) * Number(prev.videos || 1)).replace(".", ",") : prev.valor,
      videos: pack?.total_videos ? String(pack.total_videos) : prev.videos,
      pagamentoDia: pack?.payment_day ? String(pack.payment_day) : prev.pagamentoDia,
    }));
    if (pack) toast.success("Dados do pacote ativo preenchidos");
  }

  const valor = parseMoney(f.valor);
  const missing = [
    !f.cliente && "cliente", !onlyDigits(f.doc) && "CPF/CNPJ", !agency.agencia && "sua agência", !valor && "valor",
  ].filter(Boolean) as string[];

  const text = useMemo(() => {
    const data = new Date(f.inicio + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const porVideo = Number(f.videos) > 0 && valor > 0 ? ` (equivalente a ${formatBRL(valor / Number(f.videos))} por vídeo)` : "";
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE EDIÇÃO DE VÍDEO
${kind === "mensal" ? "Pacote mensal recorrente" : "Serviço avulso"}

CONTRATANTE: ${f.cliente || "[nome do cliente]"}, inscrito(a) no CPF/CNPJ sob o nº ${f.doc || "[documento]"}.
CONTRATADA: ${agency.agencia || "[nome da agência]"}${agency.agenciaDoc ? `, inscrita no CPF/CNPJ sob o nº ${agency.agenciaDoc}` : ""}.

As partes acima identificadas firmam o presente contrato, que se regerá pelas cláusulas a seguir.

CLÁUSULA 1 — OBJETO
A CONTRATADA prestará serviços de edição de ${f.videos || "[quantidade]"} vídeo(s)${kind === "mensal" ? " por mês" : ""}, conforme briefing e material enviados pelo CONTRATANTE.

CLÁUSULA 2 — VALOR E PAGAMENTO
O CONTRATANTE pagará ${valorPorExtensoSimples(valor)}${porVideo}${kind === "mensal" ? `, mensalmente, até o dia ${f.pagamentoDia || "5"} de cada mês` : ", sendo 50% na aprovação deste contrato e 50% na entrega final"}. Atrasos superiores a 5 dias permitem à CONTRATADA suspender as entregas até a regularização.

CLÁUSULA 3 — PRAZOS
Cada vídeo será entregue em até ${f.prazoEntrega || "5"} dia(s) útil(eis) após o recebimento completo do material bruto.

CLÁUSULA 4 — ALTERAÇÕES
Estão incluídas até ${f.revisoes || "2"} rodada(s) de alteração por vídeo. Alterações extras ou mudanças de roteiro após a aprovação serão orçadas à parte.

CLÁUSULA 5 — MATERIAL BRUTO
O CONTRATANTE enviará o material bruto com, no mínimo, ${f.prazoBruto || "3"} dia(s) útil(eis) de antecedência do prazo de entrega. Atrasos no envio prorrogam o prazo na mesma proporção.${kind === "mensal" ? " Vídeos não utilizados no mês por falta de material não são acumulados para o mês seguinte, salvo acordo por escrito." : ""}

CLÁUSULA 6 — DIREITOS E USO DE IMAGEM
Após a quitação, os direitos de uso dos vídeos finais pertencem ao CONTRATANTE. A CONTRATADA poderá exibir os trabalhos em seu portfólio, salvo pedido contrário por escrito. Arquivos de projeto não fazem parte da entrega.

CLÁUSULA 7 — VIGÊNCIA E RESCISÃO
${kind === "mensal" ? `Vigência a partir de ${data}, renovada automaticamente a cada mês. Qualquer parte pode rescindir com aviso prévio de 30 dias. Rescisão sem aviso implica multa de ${f.multa || "20"}% do valor mensal.` : `Vigência a partir de ${data} até a entrega final. Cancelamento após o início implica multa de ${f.multa || "20"}% do valor total.`}

CLÁUSULA 8 — FORO
As partes elegem o foro da comarca de ${agency.cidade || "[cidade da CONTRATADA]"} para dirimir quaisquer dúvidas deste contrato.

${agency.cidade ? `${agency.cidade}, ` : ""}${data}.


________________________________________
CONTRATANTE — ${f.cliente || ""}


________________________________________
CONTRATADA — ${agency.agencia || ""}`;
  }, [f, kind, agency, valor]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="space-y-4 p-5">
        <Segmented value={kind} onChange={setKind} className="w-full" options={[{ value: "mensal", label: "Pacote mensal" }, { value: "avulso", label: "Edição avulsa" }]} />
        <div className="space-y-1.5"><Label>Cliente</Label>
          <Select value={clientId} onValueChange={chooseClient}>
            <SelectTrigger><SelectValue placeholder="Escolher cliente cadastrado" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={f.cliente} onChange={set("cliente")} placeholder="ou digite o nome do contratante" />
        </div>
        <div className="space-y-1.5"><Label>CPF/CNPJ do cliente</Label><Input inputMode="numeric" value={f.doc} onChange={(e) => setF({ ...f, doc: formatDoc(e.target.value) })} placeholder="000.000.000-00" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Valor (R$)</Label><Input inputMode="decimal" value={f.valor} onChange={set("valor")} placeholder="1.500,00" /></div>
          <div className="space-y-1.5"><Label>Vídeos</Label><Input type="number" min={1} value={f.videos} onChange={set("videos")} /></div>
          <div className="space-y-1.5"><Label>Alterações</Label><Input type="number" min={0} value={f.revisoes} onChange={set("revisoes")} /></div>
          <div className="space-y-1.5"><Label>Entrega (dias úteis)</Label><Input type="number" min={1} value={f.prazoEntrega} onChange={set("prazoEntrega")} /></div>
          <div className="space-y-1.5"><Label>Bruto antes (dias)</Label><Input type="number" min={0} value={f.prazoBruto} onChange={set("prazoBruto")} /></div>
          <div className="space-y-1.5"><Label>Multa (%)</Label><Input type="number" min={0} max={100} value={f.multa} onChange={set("multa")} /></div>
          {kind === "mensal" && <div className="space-y-1.5"><Label>Dia do pagamento</Label><Input type="number" min={1} max={31} value={f.pagamentoDia} onChange={set("pagamentoDia")} /></div>}
          <div className="space-y-1.5"><Label>Início</Label><Input type="date" value={f.inicio} onChange={set("inicio")} /></div>
        </div>
        <div className="space-y-3 border-t border-border/60 pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Sua agência · fica salvo</p>
          <Input value={agency.agencia} onChange={(e) => setAgency({ ...agency, agencia: e.target.value })} placeholder="Nome da agência" />
          <div className="grid grid-cols-2 gap-3">
            <Input inputMode="numeric" value={agency.agenciaDoc} onChange={(e) => setAgency({ ...agency, agenciaDoc: formatDoc(e.target.value) })} placeholder="CPF/CNPJ" />
            <Input value={agency.cidade} onChange={(e) => setAgency({ ...agency, cidade: e.target.value })} placeholder="Cidade do foro" />
          </div>
        </div>
      </Card>
      <Card className="flex min-h-[640px] flex-col p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
          {missing.length ? (
            <p className="flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5" />Falta preencher: {missing.join(", ")}</p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Contrato completo</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyText(text, "Contrato copiado")}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
            <Button size="sm" onClick={() => printDocument(`Contrato — ${f.cliente || "cliente"}`, text)}><Printer className="mr-1 h-4 w-4" />Imprimir / PDF</Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-landing/40 p-4 md:p-8">
          <article className="mx-auto max-w-[680px] rounded-xl border border-border/50 bg-landing-panel/60 px-6 py-8 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] md:px-10">
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">{text}</pre>
          </article>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Calculadora ---------- */

export function PriceCalculator() {
  const [p, setP] = usePersistent<PriceInputs>("tools-pricing", { hourly: 40, hours: 2, videos: 10, fixed: 300, margin: 40, tax: 6 });
  const r = priceFor(p);
  const table = packageTable(p);
  const num = (label: string, key: keyof PriceInputs, suffix?: string) => (
    <div className="space-y-1.5">
      <Label className="flex justify-between"><span>{label}</span>{suffix && <span className="text-muted-foreground">{suffix}</span>}</Label>
      <Input type="number" min={0} value={p[key]} onChange={(e) => setP({ ...p, [key]: Math.max(0, Number(e.target.value) || 0) })} />
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            {num("Custo/hora", "hourly", "R$")}
            {num("Horas por vídeo", "hours", "h")}
            {num("Vídeos no pacote", "videos")}
            {num("Despesas fixas", "fixed", "R$/mês")}
            {num("Impostos", "tax", "%")}
          </div>
          <div className="space-y-2">
            <Label className="flex justify-between"><span>Margem desejada</span><span className="font-display text-primary">{p.margin}%</span></Label>
            <Slider value={[p.margin]} min={0} max={80} step={1} onValueChange={([v]) => setP({ ...p, margin: v })} />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">Despesas fixas são divididas pelos vídeos do pacote. Impostos incidem sobre o preço final.</p>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Custo por vídeo" value={formatBRL(r.costPerVideo)} tone="muted" icon={Calculator} />
            <StatCard label="Preço por vídeo" value={formatBRL(r.pricePerVideo)} note={`${p.margin}% margem`} icon={Sparkles} />
            <StatCard label="Preço do pacote" value={formatBRL(r.packagePrice)} note={`${p.videos} vídeos`} />
            <StatCard label="Lucro no pacote" value={formatBRL(r.profit)} tone={r.profit > 0 ? "success" : "danger"} note={r.breakEven ? `empata em ${r.breakEven} vídeos` : undefined} />
          </div>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Tabela de pacotes sugerida</p>
              <Button size="sm" variant="outline" onClick={() => copyText(table.map((t) => `${t.videos} vídeos — ${formatBRL(t.price)} (${formatBRL(t.perVideo)}/vídeo)`).join("\n"), "Tabela copiada")}><Copy className="mr-1 h-3.5 w-3.5" />Copiar tabela</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {table.map((t) => (
                <div key={t.videos} className={cn("rounded-xl border p-3", t.videos === p.videos ? "border-primary/60 bg-primary/10 shadow-[0_0_24px_-10px_var(--primary)]" : "border-border/60 bg-landing/60")}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t.videos} vídeos</p>
                  <p className="mt-1 font-display text-lg font-semibold">{formatBRL(t.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{formatBRL(t.perVideo)}/vídeo{t.discount > 0 ? ` · −${t.discount}%` : ""}</p>
                  <p className={cn("mt-1 text-[11px] font-medium", t.profit > 0 ? "text-success" : "text-destructive")}>lucro {formatBRL(t.profit)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Pacotes maiores ganham desconto progressivo sem deixar a margem cair abaixo de 15%.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- Ganchos IA ---------- */

type Platform = "reels" | "tiktok" | "shorts" | "youtube";
type Tone = "direto" | "curioso" | "polêmico" | "emocional" | "educativo";

export function HookGenerator() {
  const gen = useServerFn(generateHooks);
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState<Platform>("reels");
  const [tone, setTone] = useState<Tone>("direto");
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [saved, setSaved] = usePersistent<{ items: string[] }>("tools-hooks-saved", { items: [] });
  const [loading, setLoading] = useState(false);

  async function run() {
    if (topic.trim().length < 2) { toast.error("Descreva o tema do vídeo"); return; }
    setLoading(true);
    try {
      const r = await gen({ data: { topic: topic.trim(), niche: niche.trim() || undefined, platform, tone, count: 6 } });
      if (r.error) toast.error(r.error); else setHooks(r.hooks);
    } catch { toast.error("Não foi possível gerar agora."); }
    setLoading(false);
  }
  function toggleSave(text: string) {
    const has = saved.items.includes(text);
    setSaved({ items: has ? saved.items.filter((t) => t !== text) : [text, ...saved.items].slice(0, 50) });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="space-y-4 p-5">
        <div className="space-y-1.5"><Label>Tema do vídeo</Label><Textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(); }} placeholder="Ex.: 3 erros que fazem seu treino não render" /></div>
        <div className="space-y-1.5"><Label>Nicho (opcional)</Label><Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Fitness, imobiliário, estética…" /></div>
        <div className="space-y-1.5"><Label>Plataforma</Label>
          <Segmented size="sm" className="w-full" value={platform} onChange={setPlatform} options={[{ value: "reels", label: "Reels" }, { value: "tiktok", label: "TikTok" }, { value: "shorts", label: "Shorts" }, { value: "youtube", label: "YouTube" }]} />
        </div>
        <div className="space-y-1.5"><Label>Tom</Label>
          <div className="flex flex-wrap gap-1.5">
            {(["direto", "curioso", "polêmico", "emocional", "educativo"] as Tone[]).map((t) => (
              <button key={t} type="button" onClick={() => setTone(t)} className={cn("rounded-full border px-3 py-1 text-xs capitalize transition", tone === t ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_16px_-6px_var(--primary)]" : "border-border/60 text-muted-foreground hover:text-foreground")}>{t}</button>
            ))}
          </div>
        </div>
        <Button onClick={run} disabled={loading} className="w-full">{loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}{hooks.length ? "Gerar outros 6" : "Gerar 6 ganchos"}</Button>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Ganchos gerados</p>
            {hooks.length > 0 && <Button size="sm" variant="outline" onClick={() => copyText(hooks.map((h) => h.text).join("\n"), "Todos copiados")}><Copy className="mr-1 h-3.5 w-3.5" />Copiar todos</Button>}
          </div>
          {loading && !hooks.length ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-landing/70" />)}</div>
          ) : hooks.length === 0 ? (
            <EmptyState icon={Sparkles} title="Seus ganchos aparecem aqui" hint="Descreva o tema, escolha plataforma e tom e toque em Gerar." />
          ) : (
            <div className={cn("space-y-2", loading && "opacity-50")}>
              {hooks.map((h, i) => (
                <div key={i} className="group flex items-start gap-3 rounded-xl border border-border/60 bg-landing/60 p-3 transition hover:border-primary/50">
                  <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">{h.kind}</span>
                  <p className="flex-1 text-sm leading-relaxed">{h.text}</p>
                  <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Copiar" onClick={() => copyText(h.text, "Gancho copiado")}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className={cn("h-7 w-7", saved.items.includes(h.text) && "text-primary")} title="Salvar" onClick={() => toggleSave(h.text)}><Plus className={cn("h-3.5 w-3.5 transition", saved.items.includes(h.text) && "rotate-45")} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        {saved.items.length > 0 && (
          <Card className="p-5">
            <p className="mb-3 font-display text-sm font-semibold">Salvos ({saved.items.length})</p>
            <div className="space-y-1.5">
              {saved.items.map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-primary/5">
                  <p className="flex-1">{t}</p>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyText(t, "Copiado")}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => toggleSave(t)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- Checklist CQ ---------- */

const QC_DEFAULT = [
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
  const [state, setState] = usePersistent<{ items: string[]; done: string[] }>("tools-qc", { items: QC_DEFAULT, done: [] });
  const [draft, setDraft] = useState("");
  const done = new Set(state.done);
  const count = state.items.filter((i) => done.has(i)).length;
  const total = state.items.length;
  const pct = total ? (count / total) * 100 : 0;
  const complete = total > 0 && count === total;

  function toggle(item: string, v: boolean) {
    setState({ ...state, done: v ? [...state.done, item] : state.done.filter((d) => d !== item) });
  }
  function add() {
    const t = draft.trim();
    if (!t || state.items.includes(t)) return;
    setState({ ...state, items: [...state.items, t] });
    setDraft("");
  }
  function remove(item: string) {
    setState({ items: state.items.filter((i) => i !== item), done: state.done.filter((d) => d !== item) });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display font-semibold">Checklist pré-entrega</p>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", complete ? "bg-success/15 text-success ring-success/30" : "bg-landing text-muted-foreground ring-border/60")}>{count}/{total}</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-landing ring-1 ring-inset ring-border/50">
          <div className={cn("h-full rounded-full transition-all duration-500", complete ? "bg-success shadow-[0_0_12px_var(--success)]" : "bg-primary shadow-[0_0_12px_var(--primary)]")} style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-1">
          {state.items.map((item) => (
            <div key={item} className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-primary/5">
              <Checkbox id={`qc-${item}`} checked={done.has(item)} onCheckedChange={(v) => toggle(item, !!v)} />
              <label htmlFor={`qc-${item}`} className={cn("flex-1 cursor-pointer text-sm transition", done.has(item) && "text-muted-foreground line-through")}>{item}</label>
              <button type="button" onClick={() => remove(item)} className="rounded-full p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100" aria-label={`Remover ${item}`}><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Adicionar item ao seu padrão…" />
          <Button type="submit" variant="outline" disabled={!draft.trim()}><Plus className="h-4 w-4" /></Button>
        </form>
      </Card>
      <div className="space-y-4">
        <Card className={cn("p-5 text-center transition", complete && "border-success/40 shadow-[0_0_40px_-16px_var(--success)]")}>
          {complete ? <CheckCircle2 className="mx-auto h-8 w-8 text-success" /> : <AlertTriangle className="mx-auto h-8 w-8 text-warning" />}
          <p className="mt-2 font-display font-semibold">{complete ? "Pronto para entregar" : `Faltam ${total - count} itens`}</p>
          <p className="mt-1 text-xs text-muted-foreground">{complete ? "Tudo conferido. Pode enviar ao cliente." : "Confira antes de marcar o vídeo como entregue."}</p>
        </Card>
        <Button variant="outline" className="w-full" onClick={() => setState({ ...state, done: [] })}><RotateCcw className="mr-1.5 h-4 w-4" />Começar novo vídeo</Button>
        <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setState({ items: QC_DEFAULT, done: [] })}>Restaurar lista padrão</Button>
      </div>
    </div>
  );
}
