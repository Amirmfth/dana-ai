export type CurriculumLessonState = {
  id: string;
  status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
};

export function validateExactOrder(
  expectedIds: string[],
  orderedIds: string[],
) {
  if (expectedIds.length !== orderedIds.length) return false;

  const expected = new Set(expectedIds);
  return (
    orderedIds.every((id) => expected.has(id)) &&
    new Set(orderedIds).size === orderedIds.length
  );
}

export function nextStatusesAfterStructureChange(
  lessons: CurriculumLessonState[],
) {
  const firstIncomplete = lessons.find(
    (lesson) => lesson.status !== "COMPLETED",
  );

  return lessons.map((lesson) => {
    if (lesson.status === "COMPLETED") {
      return { id: lesson.id, status: "COMPLETED" as const };
    }

    if (lesson.id === firstIncomplete?.id) {
      return {
        id: lesson.id,
        status:
          lesson.status === "IN_PROGRESS"
            ? ("IN_PROGRESS" as const)
            : ("AVAILABLE" as const),
      };
    }

    return { id: lesson.id, status: "LOCKED" as const };
  });
}
