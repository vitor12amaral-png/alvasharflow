export type CopilotBrain = "gpt" | "claude";
export const BRAIN_KEY = "alvashar-copilot-brain";
export const BRAINS: { id: CopilotBrain; label: string; desc: string }[] = [
  { id: "gpt", label: "ChatGPT", desc: "OpenAI · rápido para comandos do dia a dia" },
  { id: "claude", label: "Claude", desc: "Anthropic · raciocínio cuidadoso e preciso" },
];
export function parseBrain(v: string | null | undefined): CopilotBrain {
  return v === "claude" ? "claude" : "gpt";
}
export function getBrain(): CopilotBrain {
  if (typeof window === "undefined") return "gpt";
  return parseBrain(localStorage.getItem(BRAIN_KEY));
}
export function setBrain(b: CopilotBrain) {
  localStorage.setItem(BRAIN_KEY, b);
  window.dispatchEvent(new Event("copilot-brain"));
}
