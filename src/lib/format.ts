const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/** Comparação natural: "Reels 2" vem antes de "Reels 10". */
export function naturalCompare(a: string | null | undefined, b: string | null | undefined): number {
  return collator.compare(a ?? "", b ?? "");
}

/** Ordena qualquer lista por um campo textual, respeitando numeração. */
export function sortNatural<T>(items: T[], key: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => naturalCompare(key(a), key(b)));
}

export function formatBRL(value: number | string | null | undefined): string {

  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(n as number)) return "R$ 0,00";
  return (n as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDateLong(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return d.toLocaleDateString("pt-BR");
}
