import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkSourceText,
  normalizeSourceText,
  SOURCE_MAX_CHUNKS,
} from "./chunking";

test("source normalization removes excessive whitespace", () => {
  assert.equal(normalizeSourceText("a\r\n\r\n\r\n  b"), "a\n\nb");
});

test("chunking keeps bounded overlapping chunks", () => {
  const chunks = chunkSourceText("word ".repeat(5000), 1000, 100);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.length <= SOURCE_MAX_CHUNKS);
  assert.ok(chunks.every((chunk) => chunk.content.length > 0));
});
