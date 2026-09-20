import assert from "node:assert/strict";
import test from "node:test";

import {
  courseFinalEligible,
  moduleAssessmentEligible,
} from "./eligibility";

test("module assessment ignores optional incomplete lessons", () => {
  assert.equal(
    moduleAssessmentEligible([
      { isOptional: false, status: "COMPLETED" },
      { isOptional: true, status: "AVAILABLE" },
    ]),
    true,
  );
});

test("module assessment blocks when required lesson is incomplete", () => {
  assert.equal(
    moduleAssessmentEligible([
      { isOptional: false, status: "IN_PROGRESS" },
    ]),
    false,
  );
});

test("course final requires required lessons and every module assessment pass", () => {
  assert.equal(
    courseFinalEligible({
      lessons: [{ isOptional: false, status: "COMPLETED" }],
      moduleAssessmentPasses: [true, true],
    }),
    true,
  );

  assert.equal(
    courseFinalEligible({
      lessons: [{ isOptional: false, status: "COMPLETED" }],
      moduleAssessmentPasses: [true, false],
    }),
    false,
  );
});
