import assert from "node:assert/strict";
import test from "node:test";

import {
  hasSearchableWorkspaceQuery,
  normalizeWorkspaceSearchQuery,
} from "./query";

test("workspace search query is trimmed, normalized, and bounded", () => {
  assert.equal(
    normalizeWorkspaceSearchQuery("  tcp   handshake  "),
    "tcp handshake",
  );
  assert.equal(normalizeWorkspaceSearchQuery("x".repeat(200)).length, 120);
});

test("workspace search requires at least two characters", () => {
  assert.equal(hasSearchableWorkspaceQuery("a"), false);
  assert.equal(hasSearchableWorkspaceQuery("ab"), true);
});
