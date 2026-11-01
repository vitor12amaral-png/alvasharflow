import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpeechQueue, cleanForSpeech } from "@/lib/speech-player";

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
  const queueRef = useRef<SpeechQueue | null>(null);
  const speakRafRef = useRef(0);

  useEffect(() => {
    setSupported(typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined");
    setVoiceEnabledState(localStorage.getItem(VOICE_KEY) !== "off");
    return () => cleanupRef.current();
  }, []);

  const cancelledRef = useRef(false);
  const stop = useCallback(() => {
    cancelledRef.current = false;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);
  const cancel = useCallback(() => {
    cancelledRef.current = true;
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
    queueRef.current?.stop();
    queueRef.current?.unlock();
    window.speechSynthesis?.cancel();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
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
      if (rms > 0.012) { heard = true; lastLoud = now; }
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
      if (cancelledRef.current) { cancelledRef.current = false; setState("idle"); return; }
      // Toda gravação confirmada com pelo menos ~0,6s vai para a transcrição, mesmo com voz baixa.
      const longEnough = performance.now() - began > 600;
      if (chunks.length && (heard || longEnough)) void transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      else { setState("idle"); setError("Não ouvi nada. Tente de novo."); }
    };
    recorderRef.current = rec;
    rec.start(250);
    setState("listening");
    raf = requestAnimationFrame(tick);
  }, [transcribe]);

  const browserSpeak = useCallback((text: string) => {
    if (!window.speechSynthesis) { setState((s) => (s === "speaking" ? "idle" : s)); return; }
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    u.lang = "pt-BR";
    u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.toLowerCase().startsWith("pt-br")) ?? voices.find((v) => v.lang.toLowerCase().startsWith("pt")) ?? null;
    u.onstart = () => setState("speaking");
    u.onend = u.onerror = () => setState((s) => (s === "speaking" ? "idle" : s));
    window.speechSynthesis.speak(u);
  }, []);

  const getQueue = useCallback(() => {
    if (!queueRef.current) {
      const q = new SpeechQueue();
      q.onActive = (active) => {
        cancelAnimationFrame(speakRafRef.current);
        if (active) {
          setState((s) => (s === "listening" || s === "transcribing" ? s : "speaking"));
          const loop = () => { levelRef.current = q.level(); speakRafRef.current = requestAnimationFrame(loop); };
          speakRafRef.current = requestAnimationFrame(loop);
        } else {
          levelRef.current = 0;
          setState((s) => (s === "speaking" ? "idle" : s));
        }
      };
      q.onFallback = (text) => browserSpeak(text);
      queueRef.current = q;
    }
    return queueRef.current;
  }, [browserSpeak]);

  useEffect(() => () => { queueRef.current?.stop(); cancelAnimationFrame(speakRafRef.current); }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    localStorage.setItem(VOICE_KEY, enabled ? "on" : "off");
    if (!enabled) { queueRef.current?.stop(); window.speechSynthesis?.cancel(); }
  }, []);

  /** Adds a sentence to the neural voice queue; plays in order, starting immediately. */
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    getQueue().enqueue(text);
  }, [voiceEnabled, getQueue]);

  const unlockAudio = useCallback(() => getQueue().unlock(), [getQueue]);

  const stopSpeaking = useCallback(() => {
    queueRef.current?.stop();
    window.speechSynthesis?.cancel();
    setState((s) => (s === "speaking" ? "idle" : s));
  }, []);

  return { supported, state, listening: state === "listening", error, levelRef, voiceEnabled, start, stop, cancel, speak, stopSpeaking, setVoiceEnabled, unlockAudio };
}
