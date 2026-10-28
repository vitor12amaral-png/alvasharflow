import { useEffect, useRef, type MutableRefObject } from "react";
import type { VoiceState } from "@/hooks/use-voice";

/** Living orb: a glowing core wrapped by translucent sine-wave ribbons that react to voice level. */
export function VoiceOrb({ state, levelRef, size = 72 }: { state: VoiceState | "thinking"; levelRef: MutableRefObject<number>; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = size * 2.2;
    canvas.width = W * dpr;
    canvas.height = W * dpr;
    const g = canvas.getContext("2d")!;
    g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const c1 = css.getPropertyValue("--primary").trim() || "oklch(0.72 0.13 212)";
    const c2 = css.getPropertyValue("--primary-glow").trim() || "oklch(0.59 0.17 252)";
    const c3 = css.getPropertyValue("--primary-deep").trim() || "oklch(0.46 0.13 250)";
    let raf = 0;
    let t = 0;
    let smooth = 0;
    const draw = () => {
      const s = stateRef.current;
      const target = s === "listening" || s === "speaking" ? levelRef.current : s === "thinking" || s === "transcribing" ? 0.25 + Math.sin(t * 3) * 0.1 : 0.06;
      smooth += (target - smooth) * 0.18;
      t += s === "thinking" || s === "transcribing" ? 0.05 : 0.025;
      const cx = W / 2, cy = W / 2, R = size * 0.42;
      g.clearRect(0, 0, W, W);

      // halo
      const halo = g.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * (1.9 + smooth));
      halo.addColorStop(0, c2); halo.addColorStop(1, "transparent");
      g.globalAlpha = 0.35 + smooth * 0.4;
      g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 2.4, 0, Math.PI * 2); g.fill();

      // core sphere
      g.globalAlpha = 1;
      const core = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * (1 + smooth * 0.15));
      core.addColorStop(0, c1); core.addColorStop(0.55, c2); core.addColorStop(1, c3);
      g.fillStyle = core; g.beginPath(); g.arc(cx, cy, R * (1 + smooth * 0.12), 0, Math.PI * 2); g.fill();

      // wave ribbons inside sphere
      g.save();
      g.beginPath(); g.arc(cx, cy, R * (1 + smooth * 0.12), 0, Math.PI * 2); g.clip();
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const amp = R * (0.08 + smooth * 0.55) * (1 - k * 0.18);
        for (let x = -R; x <= R; x += 2) {
          const n = x / R;
          const env = 1 - n * n;
          const y = Math.sin(n * (3 + k) + t * (2 + k * 0.7) + k) * amp * env;
          if (x === -R) g.moveTo(cx + x, cy + y); else g.lineTo(cx + x, cy + y);
        }
        g.strokeStyle = k % 2 ? c1 : "oklch(0.97 0.03 220)";
        g.globalAlpha = 0.55 - k * 0.1;
        g.lineWidth = 1.6;
        g.stroke();
      }
      g.restore();

      // gloss
      g.globalCompositeOperation = "source-over";
      const gloss = g.createRadialGradient(cx - R * 0.35, cy - R * 0.5, 0, cx - R * 0.35, cy - R * 0.5, R * 0.7);
      gloss.addColorStop(0, "oklch(1 0 0 / 0.45)"); gloss.addColorStop(1, "transparent");
      g.globalAlpha = 1; g.fillStyle = gloss; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();

      // outer reactive rings
      for (let r = 0; r < 2; r++) {
        const rr = R * (1.18 + r * 0.22 + smooth * (0.3 + r * 0.25));
        g.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          const wob = Math.sin(a * 6 + t * (3 + r)) * smooth * R * 0.08;
          const px = cx + Math.cos(a) * (rr + wob), py = cy + Math.sin(a) * (rr + wob);
          if (a === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokeStyle = c1; g.globalAlpha = 0.18 + smooth * 0.4 - r * 0.08; g.lineWidth = 1; g.stroke();
      }
      g.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, levelRef]);

  return <canvas ref={canvasRef} style={{ width: size * 2.2, height: size * 2.2, margin: -size * 0.6 }} className="pointer-events-none" aria-hidden />;
}
