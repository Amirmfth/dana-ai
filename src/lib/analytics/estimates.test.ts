import assert from "node:assert/strict";
import test from "node:test";
import { estimateLessonMinutes, estimateRemainingMinutes } from "./estimates";

test("lesson estimates have a practical minimum", () => {
  assert.equal(estimateLessonMinutes({ content: null, objectivesCount: 0, conceptsCount: 0, exerciseCount: 0 }), 8);
});

test("course estimate excludes completed lessons", () => {
  const remaining = estimateRemainingMinutes([
    { content: null, objectivesCount: 0, conceptsCount: 0, exerciseCount: 0, completed: true },
    { content: null, objectivesCount: 0, conceptsCount: 0, exerciseCount: 0, completed: false },
  ]);
  assert.equal(remaining, 8);
});
