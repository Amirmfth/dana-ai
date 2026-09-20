import assert from "node:assert/strict";
import test from "node:test";

import { aiPayloadForStorage } from "./privacy";

test("AI payload storage is opt-in", () => {
  assert.equal(
    aiPayloadForStorage("secret", {
      storeAiPayloads: false,
      retentionDays: 30,
    }),
    null,
  );

  assert.equal(
    aiPayloadForStorage("allowed", {
      storeAiPayloads: true,
      retentionDays: 30,
    }),
    "allowed",
  );
});
