import { describe, test as it } from "node:test";
import { strict as assert } from "node:assert";
import { THEME_TEMPLATES, customTemplate, resolveTemplate } from "./themes";

describe("modelos visuais", () => {
  it("oferece um modelo neutro claro estilo Apple", () => {
    const apple = THEME_TEMPLATES.find((t) => t.id === "apple-claro");
    assert.equal(apple?.mode, "light");
  });
  it("modelo personalizado usa a cor escolhida como destaque principal", () => {
    assert.equal(customTemplate("#ff3b6b").vars["--primary"], "#ff3b6b");
  });
  it("cor clara no personalizado ganha texto escuro nos botões", () => {
    assert.equal(customTemplate("#e5e5ea").vars["--primary-foreground"], "oklch(0.16 0.01 260)");
  });
  it("personalizado troca também a segunda cor (no lugar do roxo)", () => {
    assert.ok(customTemplate("#34c759").vars["--violet"].includes("#34c759"));
  });
  it("modelo da marca não sobrescreve as cores da produtora", () => {
    assert.equal(Object.keys(resolveTemplate("marca", "#000000").vars).length, 0);
  });
});
