import assert from "node:assert/strict";
import test from "node:test";

import { isAdminUser } from "./authorization";

test("admin authorization only trusts app_metadata", () => {
  assert.equal(
    isAdminUser({
      id: "user",
      app_metadata: { role: "admin" },
      user_metadata: {},
    }),
    true,
  );

  assert.equal(
    isAdminUser({
      id: "user",
      app_metadata: {},
      user_metadata: { role: "admin" },
    }),
    false,
  );
});
