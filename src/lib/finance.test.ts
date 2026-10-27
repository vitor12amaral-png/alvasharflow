import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { monthFinance, packageUsage, type FinPackage, type FinVideo, type FinClient } from "./finance";

const pkg: FinPackage = { id: "p1", client_id: "c1", status: "ativo", price: 1000, price_per_video: null, total_videos: 10, start_date: "2026-10-01", end_date: "2026-10-31" };
const clients: FinClient[] = [{ id: "c1", parent_client_id: null, price_per_video: null }, { id: "sub", parent_client_id: "c1", price_per_video: null }];
const v = (id: string, o: Partial<FinVideo> = {}): FinVideo => ({ id, client_id: "c1", package_id: "p1", competence_month: "2026-10-01", created_at: "2026-10-05T10:00:00Z", status: "editando", unit_price: null, ...o });

describe("financeiro", () => {
  test("pacote de 10 com 3 entregues mostra 30% e faltam 7", () => {
    const rows = Array.from({ length: 10 }, (_, i) => v(String(i), { status: i < 3 ? "entregue" : i === 3 ? "aprovado" : "editando" }));
    const u = packageUsage(pkg, rows, clients);
    assert.equal(u.delivered, 3);
    assert.equal(u.percent, 30);
    assert.equal(u.remaining, 7);
    assert.equal(u.exceeded, 0);
  });
  test("12 vídeos num pacote de 10 excede em 2", () => {
    assert.equal(packageUsage(pkg, Array.from({ length: 12 }, (_, i) => v(String(i))), clients).exceeded, 2);
  });
  test("vídeo antigo sem pacote de uma marca conta dentro da vigência", () => {
    const u = packageUsage(pkg, [v("a", { package_id: null, client_id: "sub" }), v("b", { package_id: null, created_at: "2026-09-20T10:00:00Z" })], clients);
    assert.equal(u.allocated, 1);
  });
  test("valor do mês usa a competência, não a data de criação", () => {
    const m = monthFinance([v("a", { status: "entregue", created_at: "2026-09-28T10:00:00Z" }), v("b", { competence_month: "2026-11-01" })], "2026-10", [pkg], clients);
    assert.equal(m.total, 1);
    assert.equal(m.forecast, 100);
    assert.equal(m.deliveredValue, 100);
  });
  test("preço próprio do vídeo tem prioridade sobre o pacote", () => {
    assert.equal(monthFinance([v("a", { unit_price: 250 })], "2026-10", [pkg], clients).forecast, 250);
  });
  test("vídeo de cliente sem pacote nem preço conta como sem valor", () => {
    assert.equal(monthFinance([v("a", { client_id: "x", package_id: null })], "2026-10", [pkg], [...clients, { id: "x", parent_client_id: null, price_per_video: null }]).unpriced, 1);
  });
});
