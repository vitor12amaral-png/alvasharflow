/**
 * SFX sutis (estilo Apple) — sintetizados via WebAudio, sem arquivos.
 * Volumes baixos, envelopes curtos. Pode ser desligado pelo usuário.
 */

const KEY = "alvashar-sfx";

let ctx: AudioContext | null = null;
let enabled = true;

if (typeof window !== "undefined") {
  enabled = localStorage.getItem(KEY) !== "off";
}

export function isSfxEnabled() {
  return enabled;
}

export function setSfxEnabled(on: boolean) {
  enabled = on;
  if (typeof window !== "undefined") localStorage.setItem(KEY, on ? "on" : "off");
  if (on) tone(880, 0.05, 0.03);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOpts = { type?: OscillatorType; delay?: number; sweepTo?: number };

function tone(freq: number, duration = 0.08, gain = 0.045, opts: ToneOpts = {}) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  /** clique leve em botões */
  tap: () => tone(660, 0.05, 0.025, { type: "triangle" }),
  /** seleção de item */
  select: () => tone(920, 0.045, 0.03, { type: "sine" }),
  /** desmarcar */
  deselect: () => tone(520, 0.045, 0.025, { type: "sine" }),
  /** ação concluída */
  success: () => {
    tone(784, 0.09, 0.035);
    tone(1175, 0.12, 0.03, { delay: 0.07 });
  },
  /** algo foi movido/solto */
  drop: () => tone(420, 0.09, 0.035, { type: "triangle", sweepTo: 620 }),
  /** abrir painel */
  open: () => tone(540, 0.07, 0.022, { type: "sine", sweepTo: 760 }),
  /** fechar/limpar */
  close: () => tone(620, 0.07, 0.02, { type: "sine", sweepTo: 380 }),
  /** cronômetro iniciado */
  start: () => tone(600, 0.1, 0.035, { type: "sine", sweepTo: 900 }),
  /** cronômetro finalizado */
  stop: () => tone(700, 0.14, 0.035, { type: "sine", sweepTo: 380 }),
  /** erro */
  error: () => tone(220, 0.16, 0.04, { type: "sawtooth" }),
};

/** Liga o "tap" global em botões/links, uma vez por app. */
export function installGlobalSfx() {
  if (typeof window === "undefined") return () => {};
  const handler = (e: PointerEvent) => {
    const el = (e.target as HTMLElement | null)?.closest?.(
      "button, [role='button'], a[href], [role='menuitem'], [role='option'], [role='tab']",
    );
    if (!el) return;
    if ((el as HTMLButtonElement).disabled) return;
    if (el.getAttribute("data-sfx") === "off") return;
    sfx.tap();
  };
  window.addEventListener("pointerdown", handler, { capture: true });
  return () => window.removeEventListener("pointerdown", handler, { capture: true } as any);
}
