import assert from "node:assert/strict";
import test from "node:test";

import { inferExplicitLearnerMemories } from "./explicit-memory";

test("captures explicit teaching preferences", () => {
  const memories = inferExplicitLearnerMemories(
    "I learn better when you give me examples before theory.",
  );

  assert.equal(memories.length, 1);
  assert.equal(memories[0]?.type, "PREFERENCE");
});

test("captures explicit learner difficulties", () => {
  const memories = inferExplicitLearnerMemories(
    "I still don't understand closures in JavaScript.",
  );

  assert.equal(memories.length, 1);
  assert.equal(memories[0]?.type, "WEAKNESS");
});

test("does not turn an ordinary question into memory", () => {
  assert.deepEqual(
    inferExplicitLearnerMemories("What is a TCP handshake?"),
    [],
  );
});
