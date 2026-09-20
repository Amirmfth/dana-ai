import assert from "node:assert/strict";
import test from "node:test";

import {
  nextStatusesAfterStructureChange,
  validateExactOrder,
} from "./curriculum";

test("exact order requires every id exactly once", () => {
  assert.equal(validateExactOrder(["a", "b"], ["b", "a"]), true);
  assert.equal(validateExactOrder(["a", "b"], ["a"]), false);
  assert.equal(validateExactOrder(["a", "b"], ["a", "a"]), false);
  assert.equal(validateExactOrder(["a", "b"], ["a", "c"]), false);
});

test("structure changes preserve completed lessons and unlock first incomplete", () => {
  const result = nextStatusesAfterStructureChange([
    { id: "1", status: "COMPLETED" },
    { id: "2", status: "LOCKED" },
    { id: "3", status: "AVAILABLE" },
  ]);

  assert.deepEqual(result, [
    { id: "1", status: "COMPLETED" },
    { id: "2", status: "AVAILABLE" },
    { id: "3", status: "LOCKED" },
  ]);
});

test("in-progress first incomplete remains in progress", () => {
  const result = nextStatusesAfterStructureChange([
    { id: "1", status: "COMPLETED" },
    { id: "2", status: "IN_PROGRESS" },
    { id: "3", status: "LOCKED" },
  ]);

  assert.equal(result[1]?.status, "IN_PROGRESS");
});
