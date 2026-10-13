import { describe, expect, test } from "bun:test";
import { groupVideoBatches, type BatchVideo } from "./video-batches";

const row = (id: string, overrides: Partial<BatchVideo> = {}): BatchVideo => ({
  id, client_id: "client-a", competence_month: "2026-10-01", batch_id: "batch-a",
  batch_label: "Reels outubro", status: "editando", clients: { name: "Alves" }, ...overrides,
});

describe("organização mensal das levas", () => {
  test("4 de 10 entregues não inclui vídeos apenas aprovados", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(String(i), { status: i < 4 ? "entregue" : i === 4 ? "aprovado" : "editando" }));
    const [batch] = groupVideoBatches(rows, "2026-10");
    expect(batch?.rows.length).toBe(10);
    expect(batch?.delivered).toBe(4);
    expect(batch?.approved).toBe(1);
  });
  test("outubro não traz vídeos de setembro", () => {
    expect(groupVideoBatches([row("oct"), row("sep", { competence_month: "2026-09-01" })], "2026-10")[0]?.rows.map(v => v.id)).toEqual(["oct"]);
  });
  test("separa clientes, levas e vídeos avulsos sem usar o nome como identidade", () => {
    const groups = groupVideoBatches([row("a"), row("b", { batch_id: "batch-b" }), row("c", { client_id: "client-b" }), row("d", { batch_id: null }), row("e", { batch_id: null })], "2026-10");
    expect(groups.length).toBe(4);
    expect(groups.find(g => g.label === "Vídeos avulsos")?.rows.length).toBe(2);
  });
});