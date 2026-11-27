import assert from "node:assert/strict";
import { test } from "node:test";
import * as shared from "../dist/index.js";

test("a published version names its number, time, publisher, and whether it is current", () => {
  const rows = [{ version: 2, publishedAt: "2026-11-26T02:00:00.000Z", publishedByName: null, isCurrent: true }];
  assert.deepEqual(shared.templateVersionListResponseSchema.parse(rows), rows);
  assert.equal(shared.templateVersionListResponseSchema.safeParse([{ ...rows[0], version: 0 }]).success, false);
  assert.equal(shared.templateVersionListResponseSchema.safeParse([{ ...rows[0], isCurrent: undefined }]).success, false);
});
