import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionEvent = Event & {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  resultIndex: number;
};

type RecognitionErrorEvent = Event & { error: string };

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const VOICE_KEY = "alvashar-copilot-voice";

export function useVoice({ onTranscript }: { onTranscript: (text: string, final: boolean) => void }) {
  const recognitionRef = useRef<Recognition | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabledState] = useState(true);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    setVoiceEnabledState(localStorage.getItem(VOICE_KEY) !== "off");
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor || listening) return;
    window.speechSynthesis?.cancel();
    const recognition = new Constructor();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText += text;
        else interimText += text;
      }
      onTranscript((finalText || interimText).trim(), Boolean(finalText));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [listening, onTranscript]);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    localStorage.setItem(VOICE_KEY, enabled ? "on" : "off");
    if (!enabled) window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !text.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("pt-br"))
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("pt"))
      ?? null;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  return { supported, listening, voiceEnabled, start, stop, speak, setVoiceEnabled };
}