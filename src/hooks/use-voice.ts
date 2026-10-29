import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoiceState = "idle" | "listening" | "transcribing" | "speaking";

const VOICE_KEY = "alvashar-copilot-voice";

/**
 * Captures the microphone with MediaRecorder (works in every modern browser),
 * exposes a live audio level for the orb waves, auto-stops after silence and
 * transcribes the clip on the server.
 */
export function useVoice({ onTranscript }: { onTranscript: (text: string, final: boolean) => void }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabledState] = useState(true);
  const levelRef = useRef(0);
  const cleanupRef = useRef<() => void>(() => {});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  useEffect(() => {
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"));
    setVoiceEnabledState(localStorage.getItem(VOICE_KEY) !== "off");
    return () => cleanupRef.current();
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const transcribe = useCallback(async (blob: Blob) => {
    setState("transcribing");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const form = new FormData();
      form.append("file", new File([blob], "fala.webm", { type: blob.type || "audio/webm" }));
      const res = await fetch("/api/transcribe", { method: "POST", body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(res.status === 402 ? "Créditos de IA esgotados." : res.status === 429 ? "Muitas solicitações, aguarde um instante." : "Não consegui entender o áudio.");
      const json = await res.json();
      const text = String(json.text ?? "").trim();
      if (text) cbRef.current(text, true);
      else setError("Não ouvi nada. Tente de novo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na transcrição.");
    } finally {
      setState((s) => (s === "transcribing" ? "idle" : s));
    }
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current?.state === "recording") return;
    setError(null);
    window.speechSynthesis?.cancel();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Permita o acesso ao microfone no navegador.");
      return;
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    let raf = 0;
    let heard = false;
    let lastLoud = performance.now();
    const began = performance.now();
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      levelRef.current = Math.min(1, rms * 6);
      const now = performance.now();
      if (rms > 0.04) { heard = true; lastLoud = now; }
      // Sem corte por silêncio: o usuário confirma quando terminar (limite de segurança de 5 min).
      void lastLoud;
      if (now - began > 300000) { rec.stop(); return; }
      raf = requestAnimationFrame(tick);
    };
    const cleanup = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
      levelRef.current = 0;
    };
    cleanupRef.current = cleanup;
    rec.onstop = () => {
      cleanup();
      recorderRef.current = null;
      if (heard && chunks.length) void transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      else { setState("idle"); setError("Não ouvi nada. Tente de novo."); }
    };
    recorderRef.current = rec;
    rec.start(250);
    setState("listening");
    raf = requestAnimationFrame(tick);
  }, [transcribe]);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    localStorage.setItem(VOICE_KEY, enabled ? "on" : "off");
    if (!enabled) window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !text.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
    u.lang = "pt-BR";
    u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.toLowerCase().startsWith("pt-br")) ?? voices.find((v) => v.lang.toLowerCase().startsWith("pt")) ?? null;
    let t = 0;
    let raf = 0;
    const pulse = () => { t += 0.18; levelRef.current = 0.35 + Math.abs(Math.sin(t)) * 0.4 * Math.random(); raf = requestAnimationFrame(pulse); };
    u.onstart = () => { setState("speaking"); raf = requestAnimationFrame(pulse); };
    u.onend = u.onerror = () => { cancelAnimationFrame(raf); levelRef.current = 0; setState((s) => (s === "speaking" ? "idle" : s)); };
    window.speechSynthesis.speak(u);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => { window.speechSynthesis?.cancel(); setState((s) => (s === "speaking" ? "idle" : s)); }, []);

  return { supported, state, listening: state === "listening", error, levelRef, voiceEnabled, start, stop, speak, stopSpeaking, setVoiceEnabled };
}
