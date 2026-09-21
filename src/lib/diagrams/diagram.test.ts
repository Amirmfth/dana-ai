import assert from "node:assert/strict";
import test from "node:test";

import { isLinearDiagram, validDiagramEdges } from "./diagram";
import { lessonContentSchema } from "@/lib/ai/schemas/lesson";

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


test("lesson schema accepts a safe structured diagram block", () => {
  const parsed = lessonContentSchema.parse({
    title: "Networking",
    introduction: "Intro",
    sections: [
      {
        ...base,
        edges: [{ from: "a", to: "b", label: "next" }],
      },
    ],
    keyTakeaways: ["A connects to B"],
    summary: "Summary",
    citations: [],
    tutorContext: {
      keyConcepts: [],
      definitions: [],
      examplesCovered: [],
      commonMistakes: [],
      assumedKnowledge: [],
    },
  });

  assert.equal(parsed.sections[0]?.type, "diagram");
});
