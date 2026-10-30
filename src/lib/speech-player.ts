import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_RATE = 24000;

function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

/** Plain text for speech: no markdown symbols, links or emoji clutter. */
export function cleanForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#`>|~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ordered neural speech queue. Each sentence is synthesized on the server and its
 * PCM stream is scheduled right after the previous one, so the first sentence
 * starts playing while the rest of the answer is still being generated.
 */
export class SpeechQueue {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private queue: string[] = [];
  private running = false;
  private playhead = 0;
  private controller: AbortController | null = null;
  private generation = 0;
  private buf = new Uint8Array(256);
  onActive: (active: boolean) => void = () => {};
  onFallback: (text: string) => void = () => {};

  private ensureContext() {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.ctx.destination);
      this.playhead = 0;
    }
    return this.ctx;
  }

  /** Call from a click so the browser allows audio later. */
  unlock() {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  }

  level() {
    if (!this.analyser || !this.sources.size) return 0;
    this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) { const v = (this.buf[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 5);
  }

  get active() { return this.running || this.sources.size > 0 || this.queue.length > 0; }

  enqueue(text: string) {
    const clean = cleanForSpeech(text);
    if (!clean) return;
    this.queue.push(clean);
    this.onActive(true);
    void this.run();
  }

  stop() {
    this.generation++;
    this.queue = [];
    this.controller?.abort();
    this.controller = null;
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    this.sources.clear();
    this.running = false;
    this.playhead = 0;
    this.onActive(false);
  }

  private settle() {
    if (!this.active) this.onActive(false);
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    const gen = this.generation;
    try {
      while (this.queue.length && gen === this.generation) {
        const text = this.queue.shift()!;
        try {
          await this.synthesize(text, gen);
        } catch (e) {
          if (gen !== this.generation || (e instanceof DOMException && e.name === "AbortError")) return;
          // Neural voice failed: speak the rest with the browser voice so the answer is never silent.
          const rest = [text, ...this.queue].join(" ");
          this.queue = [];
          this.onFallback(rest);
        }
      }
    } finally {
      if (gen === this.generation) { this.running = false; this.settle(); }
    }
  }

  private async synthesize(text: string, gen: number) {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    this.controller = new AbortController();
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text }),
      signal: this.controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);
    let pending = new Uint8Array(0);
    let done = false;
    let played = 0;
    const parser = createParser({
      onEvent: (event) => {
        if (gen !== this.generation) return;
        const payload = JSON.parse(event.data) as { type: string; audio?: string; error?: unknown };
        if (payload.type === "error" || payload.error) throw new Error("Speech failed");
        if (payload.type === "speech.audio.done") { done = true; return; }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const decoded = decodePCM(pending, Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0)));
        pending = new Uint8Array(decoded.pending);
        if (!decoded.samples.length) return;
        played += decoded.samples.length;
        const buffer = ctx.createBuffer(1, decoded.samples.length, SAMPLE_RATE);
        buffer.copyToChannel(decoded.samples, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.analyser!);
        this.sources.add(source);
        source.onended = () => { this.sources.delete(source); this.settle(); };
        this.playhead = Math.max(this.playhead, ctx.currentTime + 0.05);
        source.start(this.playhead);
        this.playhead += buffer.duration;
      },
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        parser.feed(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    if (gen === this.generation && (!done || !played)) throw new Error("Incomplete speech");
  }
}
