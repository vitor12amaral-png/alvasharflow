import { describe, expect, it } from "vitest";
import { priceFor, packageTable } from "./price-calculator";

const base = { hourly: 40, hours: 2, videos: 10, fixed: 300, margin: 40, tax: 0 };

describe("priceFor", () => {
  it("rateia despesas fixas pelos vídeos do pacote", () => {
    expect(priceFor(base).costPerVideo).toBe(110);
  });

  it("aplica a margem sobre o preço: 40% de margem em custo 110 dá 183,33", () => {
    expect(priceFor(base).pricePerVideo).toBe(183.33);
  });

  it("impostos aumentam o preço para manter a margem", () => {
    expect(priceFor({ ...base, tax: 6 }).pricePerVideo).toBeGreaterThan(priceFor(base).pricePerVideo);
  });
});

describe("packageTable", () => {
  it("nunca deixa a margem do pacote abaixo de 15%", () => {
    const rows = packageTable({ ...base, margin: 18 });
    const big = rows.find((r) => r.videos === 30)!;
    expect(big.discount).toBe(3);
  });

  it("pacote de 30 vídeos tem 10% de desconto de margem quando há folga", () => {
    expect(packageTable(base).find((r) => r.videos === 30)!.discount).toBe(10);
  });
});
