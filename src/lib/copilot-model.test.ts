import { expect, test } from "bun:test";
import { parseBrain } from "./copilot-model";
test("claude selecionado vira claude", () => expect(parseBrain("claude")).toBe("claude"));
test("qualquer outro valor usa ChatGPT", () => { expect(parseBrain(null)).toBe("gpt"); expect(parseBrain("x")).toBe("gpt"); });
