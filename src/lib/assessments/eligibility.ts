export type ModuleEligibilityLesson = {
  isOptional: boolean;
  status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
};

export function moduleAssessmentEligible(
  lessons: ModuleEligibilityLesson[],
) {
  const required = lessons.filter((lesson) => !lesson.isOptional);
  return lessons.length > 0 && required.every(
    (lesson) => lesson.status === "COMPLETED",
  );
}

export function courseFinalEligible({
  lessons,
  moduleAssessmentPasses,
}: {
  lessons: ModuleEligibilityLesson[];
  moduleAssessmentPasses: boolean[];
}) {
  const requiredLessonsSatisfied = lessons
    .filter((lesson) => !lesson.isOptional)
    .every((lesson) => lesson.status === "COMPLETED");

  return (
    requiredLessonsSatisfied &&
    moduleAssessmentPasses.length > 0 &&
    moduleAssessmentPasses.every(Boolean)
  );
}
