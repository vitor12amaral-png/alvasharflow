import { describe, expect, it } from "vitest";
import { THEME_TEMPLATES, customTemplate, resolveTemplate } from "./themes";

describe("modelos visuais", () => {
  it("oferece um modelo neutro claro estilo Apple", () => {
    const apple = THEME_TEMPLATES.find((t) => t.id === "apple-claro");
    expect(apple?.mode).toBe("light");
  });
  it("modelo personalizado usa a cor escolhida como destaque principal", () => {
    expect(customTemplate("#ff3b6b").vars["--primary"]).toBe("#ff3b6b");
  });
  it("cor clara no personalizado ganha texto escuro nos botões", () => {
    expect(customTemplate("#e5e5ea").vars["--primary-foreground"]).toBe("oklch(0.16 0.01 260)");
  });
  it("personalizado troca também a segunda cor (no lugar do roxo)", () => {
    expect(customTemplate("#34c759").vars["--violet"]).toContain("#34c759");
  });
  it("modelo da marca não sobrescreve as cores da produtora", () => {
    expect(Object.keys(resolveTemplate("marca", "#000000").vars)).toHaveLength(0);
  });
});
