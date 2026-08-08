import { useCallback, useEffect, useState } from "react";
import { setSfxEnabled, setSfxVolume } from "@/lib/sfx";

const KEY = "alvashar-prefs";

export type Preferences = {
  /** Sons de interface ligados. */
  sound: boolean;
  /** 0 a 1 */
  volume: number;
  /** Reduz/remove animações e transições. */
  reduceMotion: boolean;
  /** Densidade da interface. */
  density: "confortavel" | "compacto";
  /** Aumenta o contraste das bordas e textos secundários. */
  highContrast: boolean;
};

export const DEFAULT_PREFS: Preferences = {
  sound: true,
  volume: 0.5,
  reduceMotion: false,
  density: "confortavel",
  highContrast: false,
};

export function readPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function persist(p: Preferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("alvashar-prefs", { detail: p }));
}

/** Aplica as preferências no <html> (classes usadas pelo CSS global). */
export function applyPrefs(p: Preferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", p.reduceMotion);
  root.classList.toggle("compact-ui", p.density === "compacto");
  root.classList.toggle("high-contrast", p.highContrast);
  setSfxEnabled(p.sound, { silent: true });
  setSfxVolume(p.volume);
}

/** Hook reativo — todas as telas ficam em sincronia. */
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    const initial = readPrefs();
    setPrefs(initial);
    applyPrefs(initial);
    const onChange = (e: Event) => setPrefs((e as CustomEvent<Preferences>).detail);
    window.addEventListener("alvashar-prefs", onChange);
    return () => window.removeEventListener("alvashar-prefs", onChange);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      applyPrefs(next);
      return next;
    });
  }, []);

  return { prefs, update };
}
