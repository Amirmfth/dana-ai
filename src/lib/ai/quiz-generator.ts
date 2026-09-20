import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import { lessonQuizSchema, type LessonQuiz } from "@/lib/ai/schemas/quiz";
import { lessonContentSchema } from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";

export async function generateLessonQuiz(
  userId: string,
  lessonId: string,
): Promise<LessonQuiz> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: { not: "LOCKED" },
      module: { course: { ownerId: userId } },
    },

    include: {
      module: {
        include: {
          course: true,
        },
      },

      content: true,
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  if (!lesson.content) {
    throw new Error("Lesson content must exist before generating a quiz.");
  }

  const parsedLesson = lessonContentSchema.parse(lesson.content.content);

  const input = [
    {
      role: "system" as const,
      content: `
You generate objective exercises for a lesson in an educational application.

Your job is to test whether the learner understood the CURRENT LESSON.

SUPPORTED EXERCISE TYPES

MULTIPLE_CHOICE
- Exactly four options.
- Exactly one correct answer.
- correctAnswer must exactly match an option.

TRUE_FALSE
- Ask whether a clear factual statement or claim is true or false.
- correctAnswer is a boolean.
- Avoid statements that are partly true or interpretation-dependent.

MULTIPLE_SELECT
- Provide 4 to 6 options.
- One or more options may be correct.
- correctAnswers must exactly match options.
- Make it explicit in the question that multiple answers may be selected.

MATCHING
- Create 3 to 6 unambiguous pairs.
- Each left item must map to exactly one right item.
- Do not create duplicate or interchangeable matches.

ORDERING
- Create 3 to 6 items that have one objectively correct sequence.
- Return the items in their CORRECT order.
- The application will shuffle them before showing them.
- Only use ordering when the lesson genuinely contains a sequence, process, ranking, syntax order, chronology, or other objective ordering.

GENERAL RULES

1. Test concepts actually taught in the lesson.
2. Do not introduce unrelated future material.
3. Every exercise must be objectively and deterministically gradable.
4. Avoid subjective or open-ended questions.
5. Avoid trick questions.
6. Distractors must be plausible but clearly incorrect.
7. Prefer application and understanding over simple recall.
8. Cover different important concepts instead of repeatedly testing one detail.
9. Each exercise must identify the concept or concepts it tests.
10. Explanations must explain the correct answer clearly.
11. Use a variety of exercise types.
12. Use at least three different exercise types in each quiz when the lesson supports them.
13. Prefer using all five types when they fit naturally.
14. Do not force MATCHING or ORDERING when the lesson does not contain suitable material.

The quiz will be automatically graded, so correctness and unambiguity are critical.
      `.trim(),
    },

    {
      role: "user" as const,
      content: `
COURSE

${lesson.module.course.title}

COURSE GOAL

${lesson.module.course.goal}

LESSON

${lesson.title}

LESSON OBJECTIVES

${JSON.stringify(lesson.objectives)}

LESSON CONCEPTS

${JSON.stringify(lesson.concepts)}

GENERATED LESSON CONTENT

${JSON.stringify(parsedLesson)}
      `.trim(),
    },
  ];

  const response = await createTrackedResponse({
    userId,
    operation: "QUIZ_GENERATION",

    model: "gpt-5.6-luna",

    reasoning: {
      effort: "medium",
    },

    input,

    text: {
      format: zodTextFormat(lessonQuizSchema, "lesson_quiz"),
    },

    courseId: lesson.module.courseId,
    lessonId,
  });

  return lessonQuizSchema.parse(JSON.parse(response.output_text));
}
