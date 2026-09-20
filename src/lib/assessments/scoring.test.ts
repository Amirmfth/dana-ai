import assert from "node:assert/strict";
import test from "node:test";

import { passesEvidenceThreshold } from "./scoring";

test("placement evidence requires at least eighty percent", () => {
  assert.equal(passesEvidenceThreshold(4, 5), true);
  assert.equal(passesEvidenceThreshold(3, 5), false);
  assert.equal(passesEvidenceThreshold(1, 1), true);
  assert.equal(passesEvidenceThreshold(0, 0), false);
});
