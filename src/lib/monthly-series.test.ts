import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMonthlySeries } from "./monthly-series.ts";

const v = (m: string, status: string) => ({ competence_month: `${m}-01`, status, client_id: "c" });

test("conta aprovado e entregue como concluídos e calcula variação", () => {
  const s = buildMonthlySeries([v("2026-10", "entregue"), v("2026-10", "editando"), v("2026-11", "aprovado"), v("2026-11", "entregue"), v("2026-11", "entregue")], "2026-11", 2, () => 100);
  assert.equal(s[0].done, 1);
  assert.equal(s[1].done, 3);
  assert.equal(s[1].delta, 200);
  assert.equal(s[1].revenue, 300);
  assert.equal(s[1].tone, "good");
});

test("queda de entregas fica marcada como ruim", () => {
  const s = buildMonthlySeries([v("2026-10", "entregue"), v("2026-10", "entregue"), v("2026-11", "entregue"), v("2026-11", "fila")], "2026-11", 2);
  assert.equal(s[1].delta, -50);
  assert.equal(s[1].tone, "bad");
});
