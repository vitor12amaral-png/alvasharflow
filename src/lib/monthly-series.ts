/** Série mensal (estilo Nubank): um ponto por mês de competência, terminando no mês escolhido. */
export type SeriesVideo = { competence_month: string; status: string; client_id: string };
export type MonthPoint = {
  ym: string; label: string; total: number; done: number; pct: number;
  revenue: number; delta: number | null; tone: "good" | "bad" | "neutral";
};
const SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DONE = new Set(["aprovado", "entregue"]);

export function shiftYm(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlySeries(videos: SeriesVideo[], endYm: string, months = 6, priceOf: (clientId: string) => number = () => 0): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ym = shiftYm(endYm, -i);
    const rows = videos.filter((v) => v.competence_month.slice(0, 7) === ym);
    const done = rows.filter((v) => DONE.has(v.status)).length;
    const revenue = rows.reduce((s, v) => s + (priceOf(v.client_id) || 0), 0);
    const prev = out[out.length - 1];
    const delta = prev && prev.done > 0 ? Math.round(((done - prev.done) / prev.done) * 100) : null;
    const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
    const tone: MonthPoint["tone"] = rows.length === 0 ? "neutral" : delta !== null && delta < 0 ? "bad" : pct >= 50 || (delta ?? 0) > 0 ? "good" : "neutral";
    out.push({ ym, label: SHORT[Number(ym.slice(5, 7)) - 1], total: rows.length, done, pct, revenue, delta, tone });
  }
  return out;
}
