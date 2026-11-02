import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { priceFor, packageTable } from "./price-calculator";

const base = { hourly: 40, hours: 2, videos: 10, fixed: 300, margin: 40, tax: 0 };

describe("priceFor", () => {
  test("rateia despesas fixas pelos vídeos do pacote", () => {
    assert.equal(priceFor(base).costPerVideo, 110);
  });

  test("40% de margem sobre custo de 110 dá 183,33 por vídeo", () => {
    assert.equal(priceFor(base).pricePerVideo, 183.33);
  });

  test("impostos aumentam o preço para manter a margem", () => {
    assert.ok(priceFor({ ...base, tax: 6 }).pricePerVideo > priceFor(base).pricePerVideo);
  });
});

describe("packageTable", () => {
  test("nunca deixa a margem do pacote abaixo de 15%", () => {
    const big = packageTable({ ...base, margin: 18 }).find((r) => r.videos === 30)!;
    assert.equal(big.discount, 3);
  });

  test("pacote de 30 vídeos tem 10 pontos de desconto quando há folga", () => {
    assert.equal(packageTable(base).find((r) => r.videos === 30)!.discount, 10);
  });
});
