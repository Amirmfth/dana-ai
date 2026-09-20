import assert from "node:assert/strict";
import test from "node:test";
import { conceptBand, progressPercent } from "./core";

test("concept bands use the agreed thresholds", () => {
  assert.equal(conceptBand(3, 4), "STRENGTH");
  assert.equal(conceptBand(2, 4), "DEVELOPING");
  assert.equal(conceptBand(1, 4), "WEAKNESS");
});

test("progress percent is bounded for empty courses", () => {
  assert.equal(progressPercent(0, 0), 0);
  assert.equal(progressPercent(3, 4), 75);
});
