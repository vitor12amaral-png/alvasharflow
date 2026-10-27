/**
 * SFX sutis (estilo Apple) — sintetizados via WebAudio, sem arquivos.
 * Volumes baixos, envelopes curtos. Pode ser desligado e ter o volume ajustado.
 */

const KEY = "alvashar-sfx";
const VOL_KEY = "alvashar-sfx-volume";

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.5;

if (typeof window !== "undefined") {
  enabled = localStorage.getItem(KEY) !== "off";
  const v = Number(localStorage.getItem(VOL_KEY));
  if (Number.isFinite(v) && v >= 0 && v <= 1) volume = v;
}

export function isSfxEnabled() {
  return enabled;
}

export function getSfxVolume() {
  return volume;
}

export function setSfxEnabled(on: boolean, opts: { silent?: boolean } = {}) {
  enabled = on;
  if (typeof window !== "undefined") localStorage.setItem(KEY, on ? "on" : "off");
  if (on && !opts.silent) sfx.select();
}

export function setSfxVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (typeof window !== "undefined") localStorage.setItem(VOL_KEY, String(volume));
}

/** Toca uma amostra para o usuário ouvir enquanto ajusta o volume. */
export function previewSfx() {
  sfx.success();
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

/** Tom suave com ataque rápido e decaimento exponencial (timbre "vidro"). */
function tone(freq: number, duration = 0.08, gain = 0.045, opts: ToneOpts = {}) {
  if (!enabled || volume <= 0) return;
  const ac = audio();
  if (!ac) return;
  const peak = Math.max(0.0002, gain * volume * 2);
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = Math.min(9000, freq * 4);
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + duration * 0.6);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(lp).connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

let noiseBuf: AudioBuffer | null = null;

/** Micro-clique mecânico: ruído curtíssimo filtrado (como o trackpad / teclado do iPhone). */
function click(center = 3200, duration = 0.012, gain = 0.05, delay = 0) {
  if (!enabled || volume <= 0) return;
  const ac = audio();
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = center;
  bp.Q.value = 1.4;
  const g = ac.createGain();
  const peak = Math.max(0.0002, gain * volume * 2);
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.01);
}

export const sfx = {
  /** clique tátil em botões */
  tap: () => click(3400, 0.01, 0.035),
  /** seleção: clique + "pop" oco */
  select: () => { click(2600, 0.01, 0.03); tone(1320, 0.05, 0.012, { sweepTo: 990 }); },
  /** desmarcar */
  deselect: () => { click(1800, 0.012, 0.028); tone(880, 0.05, 0.01, { sweepTo: 660 }); },
  /** ação concluída: dois toques de vidro em quinta */
  success: () => {
    tone(1046.5, 0.32, 0.02);
    tone(2093, 0.22, 0.006);
    tone(1568, 0.42, 0.018, { delay: 0.085 });
    tone(3136, 0.25, 0.005, { delay: 0.085 });
  },
  /** algo foi movido/solto: impacto abafado */
  drop: () => { click(900, 0.02, 0.04); tone(180, 0.09, 0.03, { sweepTo: 110 }); },
  /** abrir painel: sopro curto ascendente */
  open: () => { click(4200, 0.008, 0.018); tone(740, 0.09, 0.008, { sweepTo: 1100 }); },
  /** fechar/limpar */
  close: () => { click(2400, 0.008, 0.016); tone(900, 0.08, 0.007, { sweepTo: 600 }); },
  /** cronômetro iniciado */
  start: () => { tone(1174.7, 0.18, 0.016); tone(1760, 0.22, 0.012, { delay: 0.06 }); },
  /** cronômetro pausado */
  pause: () => { click(2000, 0.012, 0.03); tone(660, 0.12, 0.012); },
  /** cronômetro finalizado */
  stop: () => { tone(1568, 0.25, 0.014); tone(1046.5, 0.35, 0.014, { delay: 0.08 }); },
  /** erro: dois toques graves e curtos */
  error: () => { tone(330, 0.09, 0.03); tone(294, 0.12, 0.03, { delay: 0.11 }); },
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
