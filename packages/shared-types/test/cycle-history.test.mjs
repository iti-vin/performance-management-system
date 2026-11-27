import assert from "node:assert/strict";
import { test } from "node:test";
import * as shared from "../dist/index.js";

const ENTRY = {
  eventId: "00000000-0000-0000-0000-000000000501",
  occurredAt: "2026-11-26T02:00:00.000Z",
  area: "cycle",
  employeeName: null,
  perspective: null,
  action: "released",
  actorName: "Lebron James",
  reason: null,
  before: { releasedAt: null },
  after: { releasedAt: "2026-11-26T02:00:00.000Z", resultCount: 1, employeeVisible: false },
};

test("a history entry carries plain values by name, so the page can put them in words", () => {
  assert.deepEqual(shared.cycleHistoryResponseSchema.parse([ENTRY]), [ENTRY]);
  const refused = (change) => assert.equal(shared.cycleHistoryResponseSchema.safeParse([{ ...ENTRY, ...change }]).success, false);
  refused({ after: "state: active" });
  refused({ after: { answers: { q: 1 } } });
});
