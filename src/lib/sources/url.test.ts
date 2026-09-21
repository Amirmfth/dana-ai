import assert from "node:assert/strict";
import test from "node:test";

import { validatePublicUrl } from "./url";

test("URL source validation rejects local addresses", async () => {
  await assert.rejects(() => validatePublicUrl("http://127.0.0.1/test"));
  await assert.rejects(() => validatePublicUrl("http://localhost/test"));
});

test("URL source validation rejects non-http protocols", async () => {
  await assert.rejects(() => validatePublicUrl("file:///etc/passwd"));
});
