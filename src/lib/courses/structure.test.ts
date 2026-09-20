import assert from "node:assert/strict";
import test from "node:test";

import {
  courseStructureSchema,
  parseLineList,
} from "./structure";

test("course structure strips fields outside the import contract", () => {
  const parsed = courseStructureSchema.parse({
    version: 1,
    course: {
      title: "Course",
      description: null,
      goal: "Goal",
      instructions: null,
      ownerId: "should-not-import",
      modules: [],
    },
  });

  assert.equal("ownerId" in parsed.course, false);
});

test("line list accepts commas and newlines", () => {
  assert.deepEqual(
    parseLineList("One, Two\nThree"),
    ["One", "Two", "Three"],
  );
});
