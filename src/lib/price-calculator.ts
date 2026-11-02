export type PriceInputs = {
  /** Custo por hora do editor (R$). */
  hourly: number;
  /** Horas gastas por vídeo. */
  hours: number;
  /** Vídeos no pacote. */
  videos: number;
  /** Despesas fixas do mês (R$), rateadas pelos vídeos do pacote. */
  fixed: number;
  /** Margem desejada sobre o preço líquido (%). */
  margin: number;
  /** Impostos sobre o preço final (%). */
  tax: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Preço por vídeo que cobre custo, impostos e entrega a margem pedida. */
export function priceFor(p: PriceInputs, videos = p.videos) {
  const n = Math.max(1, videos);
  const costPerVideo = p.hourly * p.hours + p.fixed / n;
  const keep = 1 - Math.min(95, p.margin) / 100 - Math.min(50, p.tax) / 100;
  const pricePerVideo = costPerVideo / Math.max(0.05, keep);
  const packagePrice = pricePerVideo * n;
  const profit = packagePrice * (1 - p.tax / 100) - costPerVideo * n;
  const netPerVideo = pricePerVideo * (1 - p.tax / 100) - p.hourly * p.hours;
  const breakEven = netPerVideo > 0 ? Math.ceil(p.fixed / netPerVideo) : Infinity;
  return {
    costPerVideo: round2(costPerVideo),
    pricePerVideo: round2(pricePerVideo),
    packagePrice: round2(packagePrice),
    profit: round2(profit),
    breakEven: Number.isFinite(breakEven) ? breakEven : 0,
  };
}

const SIZES = [4, 10, 20, 30];
const DISCOUNT: Record<number, number> = { 4: 0, 10: 0, 20: 5, 30: 10 };
const MIN_MARGIN = 15;

/** Tabela de pacotes com desconto progressivo, sem deixar a margem cair abaixo de 15%. */
export function packageTable(p: PriceInputs) {
  const sizes = Array.from(new Set([...SIZES, p.videos])).filter((v) => v > 0).sort((a, b) => a - b).slice(0, 5);
  return sizes.map((videos) => {
    const discount = DISCOUNT[videos] ?? (videos >= 30 ? 10 : videos >= 20 ? 5 : 0);
    const margin = Math.max(MIN_MARGIN, p.margin - discount);
    const effective = Math.min(discount, p.margin - margin);
    const r = priceFor({ ...p, margin }, videos);
    return { videos, price: r.packagePrice, perVideo: r.pricePerVideo, profit: r.profit, discount: Math.max(0, effective) };
  });
}
