import { lessonContentSchema } from "@/lib/ai/schemas/lesson";

type EstimateInput = {
  content: unknown | null;
  objectivesCount: number;
  conceptsCount: number;
  exerciseCount: number;
};

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function lessonTextWords(content: unknown) {
  const parsed = lessonContentSchema.safeParse(content);
  if (!parsed.success) return null;

  const lesson = parsed.data;
  let words =
    wordCount(lesson.introduction) +
    wordCount(lesson.summary) +
    lesson.keyTakeaways.reduce((sum, item) => sum + wordCount(item), 0);

  for (const section of lesson.sections) {
    words += wordCount(section.title ?? "");

    if (section.type === "text" || section.type === "note") {
      words += wordCount(section.content);
    } else if (section.type === "example") {
      words += wordCount(section.example) + wordCount(section.explanation);
    } else if (section.type === "list") {
      words += section.items.reduce(
        (sum, item) => sum + wordCount(item),
        0,
      );
    } else if (section.type === "diagram") {
      words +=
        section.nodes.reduce(
          (sum, node) =>
            sum +
            wordCount(node.label) +
            wordCount(node.detail ?? "") +
            wordCount(node.group ?? ""),
          0,
        ) +
        section.edges.reduce(
          (sum, edge) => sum + wordCount(edge.label ?? ""),
          0,
        ) +
        wordCount(section.caption ?? "");
    }
  }

  return words;
}

export function estimateLessonMinutes(input: EstimateInput) {
  const words = input.content ? lessonTextWords(input.content) : null;

  const readingMinutes =
    words === null
      ? 5 + input.objectivesCount * 1.5 + input.conceptsCount * 0.5
      : words / 220;

  const practiceMinutes = input.exerciseCount * 1;

  return Math.max(8, Math.min(90, Math.ceil(readingMinutes + practiceMinutes)));
}

export function estimateRemainingMinutes(
  lessons: Array<EstimateInput & { completed: boolean }>,
) {
  return lessons
    .filter((lesson) => !lesson.completed)
    .reduce((sum, lesson) => sum + estimateLessonMinutes(lesson), 0);
}
