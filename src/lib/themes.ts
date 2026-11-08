/**
 * Modelos visuais do app inteiro. Cada modelo troca todas as cores de destaque
 * (botões, luzes, brilhos, gráficos) — não só o fundo. "marca" usa as cores
 * definidas pela produtora em Marca & tema.
 */
export type TemplateId = "marca" | "apple-claro" | "grafite" | "solar" | "esmeralda" | "aurora" | "oceano" | "personalizado";

export type ThemeTemplate = {
  id: TemplateId;
  label: string;
  description: string;
  mode: "dark" | "light";
  /** Cores para a miniatura em Configurações. */
  swatch: [string, string, string];
  vars: Record<string, string>;
};

function accentVars(primary: string, glow: string, deep: string, violet: string, violetGlow: string, onAccent = "oklch(0.99 0 0)"): Record<string, string> {
  return {
    "--primary": primary,
    "--primary-glow": glow,
    "--primary-deep": deep,
    "--primary-foreground": onAccent,
    "--violet": violet,
    "--violet-glow": violetGlow,
    "--violet-foreground": onAccent,
    "--ring": `color-mix(in oklab, ${primary} 60%, transparent)`,
    "--sidebar-primary": primary,
    "--chart-1": primary,
    "--chart-4": violet,
    "--brand-accent": violet,
    "--gradient-cta": `linear-gradient(110deg, ${primary} 0%, color-mix(in oklab, ${primary} 50%, ${violet}) 55%, ${violet} 100%)`,
    "--gradient-arctic": `linear-gradient(135deg, ${glow}, ${primary} 55%, ${deep})`,
    "--gradient-rim": `conic-gradient(from 200deg at 50% 50%, transparent 0deg, ${glow} 60deg, ${violetGlow} 90deg, ${primary} 130deg, transparent 200deg)`,
    "--gradient-beam": `linear-gradient(180deg, ${violetGlow} 0%, color-mix(in oklab, ${violet} 60%, transparent) 45%, transparent 100%)`,
  };
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: "marca",
    label: "Alvashar Elétrico",
    description: "Azul elétrico e roxo vivos. Usa a cor da sua marca.",
    mode: "dark",
    swatch: ["oklch(0.1 0.008 270)", "oklch(0.66 0.2 256)", "oklch(0.6 0.26 298)"],
    vars: {},
  },
  {
    id: "apple-claro",
    label: "Apple Glass Claro",
    description: "Branco, vidro fosco e azul suave. Limpo como o sistema da Apple.",
    mode: "light",
    swatch: ["oklch(0.97 0.004 260)", "oklch(0.6 0.17 255)", "oklch(0.82 0.01 260)"],
    vars: accentVars("oklch(0.6 0.17 255)", "oklch(0.7 0.13 245)", "oklch(0.48 0.15 258)", "oklch(0.62 0.12 275)", "oklch(0.72 0.1 270)"),
  },
  {
    id: "grafite",
    label: "Grafite Glass",
    description: "Escuro neutro com vidro e branco. Sem cor, só luz.",
    mode: "dark",
    swatch: ["oklch(0.13 0 0)", "oklch(0.93 0 0)", "oklch(0.6 0 0)"],
    vars: accentVars("oklch(0.93 0.003 260)", "oklch(0.98 0 0)", "oklch(0.7 0.005 260)", "oklch(0.72 0.005 260)", "oklch(0.88 0.003 260)", "oklch(0.16 0.005 260)"),
  },
  {
    id: "solar",
    label: "Solar",
    description: "Âmbar e laranja quentes, como um pôr do sol.",
    mode: "dark",
    swatch: ["oklch(0.12 0.01 50)", "oklch(0.72 0.18 55)", "oklch(0.64 0.22 30)"],
    vars: accentVars("oklch(0.72 0.18 55)", "oklch(0.82 0.15 75)", "oklch(0.52 0.15 45)", "oklch(0.64 0.22 30)", "oklch(0.74 0.18 40)"),
  },
  {
    id: "esmeralda",
    label: "Esmeralda",
    description: "Verde sofisticado com toque de turquesa.",
    mode: "dark",
    swatch: ["oklch(0.12 0.015 170)", "oklch(0.72 0.16 160)", "oklch(0.66 0.12 195)"],
    vars: accentVars("oklch(0.72 0.16 160)", "oklch(0.8 0.13 170)", "oklch(0.5 0.11 165)", "oklch(0.66 0.12 195)", "oklch(0.76 0.11 190)"),
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Rosa e magenta vibrantes.",
    mode: "dark",
    swatch: ["oklch(0.12 0.015 330)", "oklch(0.68 0.22 350)", "oklch(0.62 0.24 310)"],
    vars: accentVars("oklch(0.68 0.22 350)", "oklch(0.78 0.17 355)", "oklch(0.5 0.17 350)", "oklch(0.62 0.24 310)", "oklch(0.72 0.2 315)"),
  },
  {
    id: "oceano",
    label: "Oceano",
    description: "Ciano ártico e azul profundo.",
    mode: "dark",
    swatch: ["oklch(0.11 0.015 230)", "oklch(0.76 0.13 210)", "oklch(0.56 0.17 252)"],
    vars: accentVars("oklch(0.76 0.13 210)", "oklch(0.85 0.1 205)", "oklch(0.5 0.12 225)", "oklch(0.56 0.17 252)", "oklch(0.68 0.15 245)", "oklch(0.15 0.02 230)"),
  },
];

/** Gera o modelo "Personalizado" a partir de qualquer cor escolhida (hex). */
export function customTemplate(color: string, mode: "dark" | "light" = "dark"): ThemeTemplate {
  const c = /^#[0-9a-f]{6}$/i.test(color) ? color : "#7c5cff";
  const glow = `color-mix(in oklab, ${c} 70%, white)`;
  const deep = `color-mix(in oklab, ${c} 65%, black)`;
  const second = `oklch(from ${c} l c calc(h + 40))`;
  const secondGlow = `oklch(from ${c} calc(l + 0.1) c calc(h + 45))`;
  const onAccent = luminance(c) > 0.6 ? "oklch(0.16 0.01 260)" : "oklch(0.99 0 0)";
  return {
    id: "personalizado",
    label: "Personalizado",
    description: "A cor que você preferir.",
    mode,
    swatch: [mode === "light" ? "oklch(0.97 0 0)" : "oklch(0.12 0 0)", c, second],
    vars: accentVars(c, glow, deep, second, secondGlow, onAccent),
  };
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function resolveTemplate(id: TemplateId, customColor: string, customMode: "dark" | "light" = "dark"): ThemeTemplate {
  if (id === "personalizado") return customTemplate(customColor, customMode);
  return THEME_TEMPLATES.find((t) => t.id === id) ?? THEME_TEMPLATES[0];
}

// Todas as variáveis que algum modelo pode definir (para limpar ao trocar).
const ALL_KEYS = Array.from(new Set(THEME_TEMPLATES.concat(customTemplate("#7c5cff")).flatMap((t) => Object.keys(t.vars))));

let active: TemplateId = "marca";
let reapplyBranding: (() => void) | null = null;

export function activeTemplate() { return active; }
/** A marca registra como se reaplicar quando o modelo "marca" volta a valer. */
export function registerBrandingReapply(fn: () => void) { reapplyBranding = fn; }

export function applyTemplate(t: ThemeTemplate) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  active = t.id;
  root.dataset.template = t.id;
  for (const k of ALL_KEYS) root.style.removeProperty(k);
  if (t.id === "marca") {
    reapplyBranding?.();
    return;
  }
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  root.classList.toggle("theme-light", t.mode === "light");
}
