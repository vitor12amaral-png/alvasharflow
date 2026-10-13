import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { groupVideoBatches, type BatchVideo } from "./video-batches";

const row = (id: string, overrides: Partial<BatchVideo> = {}): BatchVideo => ({
  id, client_id: "client-a", competence_month: "2026-10-01", batch_id: "batch-a",
  batch_label: "Reels outubro", status: "editando", clients: { name: "Alves" }, ...overrides,
});

describe("organização mensal das levas", () => {
  test("4 de 10 entregues não inclui vídeos apenas aprovados", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(String(i), { status: i < 4 ? "entregue" : i === 4 ? "aprovado" : "editando" }));
    const [batch] = groupVideoBatches(rows, "2026-10");
    assert.equal(batch?.rows.length, 10);
    assert.equal(batch?.delivered, 4);
    assert.equal(batch?.approved, 1);
  });
  test("outubro não traz vídeos de setembro", () => {
    assert.deepEqual(groupVideoBatches([row("oct"), row("sep", { competence_month: "2026-09-01" })], "2026-10")[0]?.rows.map(v => v.id), ["oct"]);
  });
  test("separa clientes, levas e vídeos avulsos sem usar o nome como identidade", () => {
    const groups = groupVideoBatches([row("a"), row("b", { batch_id: "batch-b" }), row("c", { client_id: "client-b" }), row("d", { batch_id: null }), row("e", { batch_id: null })], "2026-10");
    assert.equal(groups.length, 4);
    assert.equal(groups.find(g => g.label === "Vídeos avulsos")?.rows.length, 2);
  });
});