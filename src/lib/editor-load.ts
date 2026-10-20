export const DAILY_CAPACITY_HOURS = 8;
export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;
export const DEFAULT_VIDEO_HOURS = 2;

export const BLOCK_REASONS = [
  { id: "aguardando_material", label: "Aguardando material" },
  { id: "aguardando_cliente", label: "Aguardando resposta do cliente" },
  { id: "duvida_briefing", label: "Dúvida no briefing" },
  { id: "outro", label: "Outro" },
] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number]["id"];
export function blockLabel(r: string | null | undefined): string | null {
  if (!r) return null;
  return BLOCK_REASONS.find((b) => b.id === r)?.label ?? r;
}

export type LoadVideo = { editor_id: string | null; status: string; estimated_hours: number | null; due_date: string | null };

const isOpen = (v: LoadVideo) => v.status !== "aprovado" && v.status !== "entregue";
const hoursOf = (v: LoadVideo) => (v.estimated_hours != null && v.estimated_hours >= 0 ? Number(v.estimated_hours) : DEFAULT_VIDEO_HOURS);

/** Open hours and active video count per editor. */
export function editorLoad(videos: LoadVideo[]): Map<string, { hours: number; active: number }> {
  const m = new Map<string, { hours: number; active: number }>();
  for (const v of videos) {
    if (!v.editor_id || !isOpen(v)) continue;
    const cur = m.get(v.editor_id) ?? { hours: 0, active: 0 };
    cur.hours += hoursOf(v);
    cur.active += 1;
    m.set(v.editor_id, cur);
  }
  return m;
}

/** Days where an editor has more estimated hours due than fit in one day. */
export function overloadedDays(videos: LoadVideo[], dailyCap = DAILY_CAPACITY_HOURS): { editorId: string; date: string; hours: number }[] {
  const m = new Map<string, number>();
  for (const v of videos) {
    if (!v.editor_id || !v.due_date || !isOpen(v)) continue;
    const k = `${v.editor_id}|${v.due_date}`;
    m.set(k, (m.get(k) ?? 0) + hoursOf(v));
  }
  return [...m.entries()]
    .filter(([, h]) => h > dailyCap)
    .map(([k, hours]) => { const [editorId, date] = k.split("|"); return { editorId, date, hours }; })
    .sort((a, b) => a.date.localeCompare(b.date));
}
