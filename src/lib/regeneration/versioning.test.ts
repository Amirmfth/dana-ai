import assert from "node:assert/strict";
import test from "node:test";

import {
  nextVersionNumber,
  planSafeAdditiveRevision,
} from "./versioning";

test("generation versions increase monotonically", () => {
  assert.equal(nextVersionNumber(undefined), 1);
  assert.equal(nextVersionNumber(1), 2);
  assert.equal(nextVersionNumber(8), 9);
});

test("curriculum revision planning never emits destructive deletes", () => {
  assert.deepEqual(planSafeAdditiveRevision(3, 2), [
    { kind: "update", proposedIndex: 0, existingIndex: 0 },
    { kind: "update", proposedIndex: 1, existingIndex: 1 },
  ]);

  assert.deepEqual(planSafeAdditiveRevision(1, 3), [
    { kind: "update", proposedIndex: 0, existingIndex: 0 },
    { kind: "create", proposedIndex: 1 },
    { kind: "create", proposedIndex: 2 },
  ]);
});
