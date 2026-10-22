import { describe, test as it } from "node:test";
import { strict as assert } from "node:assert";
import { editorLoad, overloadedDays } from "./editor-load";

describe("editor load", () => {
  it("ignores approved and delivered videos", () => {
    const m = editorLoad([
      { editor_id: "a", status: "editando", estimated_hours: 3, due_date: null },
      { editor_id: "a", status: "aprovado", estimated_hours: 5, due_date: null },
      { editor_id: "a", status: "entregue", estimated_hours: 5, due_date: null },
    ]);
    assert.deepEqual(m.get("a"), { hours: 3, active: 1 });
  });

  it("flags a day above 8 hours", () => {
    const r = overloadedDays([
      { editor_id: "a", status: "fila", estimated_hours: 6, due_date: "2026-10-22" },
      { editor_id: "a", status: "fila", estimated_hours: 5, due_date: "2026-10-22" },
      { editor_id: "a", status: "fila", estimated_hours: 8, due_date: "2026-10-23" },
    ]);
    assert.deepEqual(r, [{ editorId: "a", date: "2026-10-22", hours: 11 }]);
  });
});
