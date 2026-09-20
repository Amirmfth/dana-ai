export type ProgressLesson = {
  id: string;
  status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  prerequisiteIds: string[];
};

export function nextStatusesFromPrerequisites(
  lessons: ProgressLesson[],
) {
  const completed = new Set(
    lessons
      .filter((lesson) => lesson.status === "COMPLETED")
      .map((lesson) => lesson.id),
  );

  return lessons.map((lesson) => {
    if (lesson.status === "COMPLETED") {
      return { id: lesson.id, status: "COMPLETED" as const };
    }

    const unlocked = lesson.prerequisiteIds.every((id) =>
      completed.has(id),
    );

    if (!unlocked) {
      return { id: lesson.id, status: "LOCKED" as const };
    }

    return {
      id: lesson.id,
      status:
        lesson.status === "IN_PROGRESS"
          ? ("IN_PROGRESS" as const)
          : ("AVAILABLE" as const),
    };
  });
}

export function hasPrerequisiteCycle(
  nodes: Array<{ id: string; prerequisiteIds: string[] }>,
) {
  const graph = new Map(
    nodes.map((node) => [node.id, node.prerequisiteIds]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;

    visiting.add(id);
    for (const prerequisite of graph.get(id) ?? []) {
      if (graph.has(prerequisite) && visit(prerequisite)) {
        return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return nodes.some((node) => visit(node.id));
}
