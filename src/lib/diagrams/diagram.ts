import type { z } from "zod";

import { lessonDiagramSchema } from "@/lib/ai/schemas/lesson";

export type LessonDiagram = z.infer<typeof lessonDiagramSchema>;

export function validDiagramEdges(diagram: LessonDiagram) {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));

  return diagram.edges.filter(
    (edge) =>
      nodeIds.has(edge.from) &&
      nodeIds.has(edge.to) &&
      edge.from !== edge.to,
  );
}

export function isLinearDiagram(diagram: LessonDiagram) {
  const edges = validDiagramEdges(diagram);
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
  }

  return (
    edges.length <= Math.max(0, diagram.nodes.length - 1) &&
    [...incoming.values()].every((count) => count <= 1) &&
    [...outgoing.values()].every((count) => count <= 1)
  );
}
