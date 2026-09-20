import assert from "node:assert/strict";
import test from "node:test";

import {
  GENERATION_STALE_AFTER_MS,
  canClaimGeneration,
  isGenerationStale,
  safeGenerationError,
} from "./state";

test("new and failed generations are claimable", () => {
  assert.equal(canClaimGeneration("NOT_STARTED", null), true);
  assert.equal(canClaimGeneration("FAILED", null), true);
  assert.equal(canClaimGeneration("READY", null), false);
});

test("active generation leases are not claimable until stale", () => {
  const now = new Date("2026-09-20T12:00:00.000Z");
  const fresh = new Date(now.getTime() - GENERATION_STALE_AFTER_MS + 1);
  const stale = new Date(now.getTime() - GENERATION_STALE_AFTER_MS);

  assert.equal(isGenerationStale("GENERATING", fresh, now), false);
  assert.equal(canClaimGeneration("GENERATING", fresh, now), false);

  assert.equal(isGenerationStale("GENERATING", stale, now), true);
  assert.equal(canClaimGeneration("GENERATING", stale, now), true);
});

test("generation errors are safely bounded for persistence", () => {
  const value = safeGenerationError(new Error("x".repeat(3000)));
  assert.equal(value.length, 2000);
});
