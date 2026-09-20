import assert from "node:assert/strict";
import test from "node:test";

import { isSemanticDuplicate } from "./vector-memory";

test("semantic duplicate threshold defaults to 0.9", () => {
  assert.equal(isSemanticDuplicate(0.95), true);
  assert.equal(isSemanticDuplicate(0.9), true);
  assert.equal(isSemanticDuplicate(0.8999), false);
});

test("semantic duplicate threshold can be overridden", () => {
  assert.equal(isSemanticDuplicate(0.85, 0.8), true);
  assert.equal(isSemanticDuplicate(0.79, 0.8), false);
});
