import assert from "node:assert/strict";
import test from "node:test";

import {
  hasPrerequisiteCycle,
  nextStatusesFromPrerequisites,
} from "./prerequisites";

test("lessons unlock when every prerequisite is completed", () => {
  const result = nextStatusesFromPrerequisites([
    { id: "a", status: "COMPLETED", prerequisiteIds: [] },
    { id: "b", status: "LOCKED", prerequisiteIds: ["a"] },
    { id: "c", status: "LOCKED", prerequisiteIds: ["a", "b"] },
  ]);

  assert.deepEqual(result, [
    { id: "a", status: "COMPLETED" },
    { id: "b", status: "AVAILABLE" },
    { id: "c", status: "LOCKED" },
  ]);
});

test("independent branches can unlock in parallel", () => {
  const result = nextStatusesFromPrerequisites([
    { id: "a", status: "COMPLETED", prerequisiteIds: [] },
    { id: "b", status: "LOCKED", prerequisiteIds: ["a"] },
    { id: "c", status: "LOCKED", prerequisiteIds: ["a"] },
  ]);

  assert.equal(result[1]?.status, "AVAILABLE");
  assert.equal(result[2]?.status, "AVAILABLE");
});

test("cycle detection rejects cyclic prerequisite graphs", () => {
  assert.equal(
    hasPrerequisiteCycle([
      { id: "a", prerequisiteIds: ["b"] },
      { id: "b", prerequisiteIds: ["a"] },
    ]),
    true,
  );

  assert.equal(
    hasPrerequisiteCycle([
      { id: "a", prerequisiteIds: [] },
      { id: "b", prerequisiteIds: ["a"] },
    ]),
    false,
  );
});
