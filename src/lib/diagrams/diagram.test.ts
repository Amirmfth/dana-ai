import assert from "node:assert/strict";
import test from "node:test";

import { isLinearDiagram, validDiagramEdges } from "./diagram";

const base = {
  type: "diagram" as const,
  title: "Flow",
  diagramType: "FLOW" as const,
  direction: "VERTICAL" as const,
  caption: null,
  nodes: [
    { id: "a", label: "A", detail: null, group: null },
    { id: "b", label: "B", detail: null, group: null },
  ],
};

test("diagram helpers drop invalid and self-referencing edges", () => {
  const diagram = {
    ...base,
    edges: [
      { from: "a", to: "b", label: null },
      { from: "a", to: "missing", label: null },
      { from: "b", to: "b", label: null },
    ],
  };

  assert.deepEqual(validDiagramEdges(diagram), [
    { from: "a", to: "b", label: null },
  ]);
});

test("diagram helper detects simple linear flows", () => {
  assert.equal(
    isLinearDiagram({
      ...base,
      edges: [{ from: "a", to: "b", label: "next" }],
    }),
    true,
  );
});
