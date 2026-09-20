import assert from "node:assert/strict";
import test from "node:test";

import { isLessonAccessible } from "./lesson-access";

test("locked lessons are inaccessible", () => {
  assert.equal(isLessonAccessible("LOCKED"), false);
  assert.equal(isLessonAccessible("AVAILABLE"), true);
  assert.equal(isLessonAccessible("IN_PROGRESS"), true);
  assert.equal(isLessonAccessible("COMPLETED"), true);
});
