import { Prisma } from "@/generated/prisma/client";

import { buildLessonContext } from "@/lib/ai/lesson-context";
import { generateLesson } from "@/lib/ai/lesson-generator";
import {
  lessonContentSchema,
  type GeneratedLessonContent,
} from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";

export async function getOrGenerateLesson(
  lessonId: string,
): Promise<GeneratedLessonContent> {
  /*
   * First check whether this lesson was already generated.
   */
  const existing = await prisma.lessonContent.findUnique({
    where: {
      lessonId,
    },
  });

  if (existing) {
    return lessonContentSchema.parse(existing.content);
  }

  /*
   * No content yet.
   *
   * Build the minimum useful context and ask the teaching model
   * to generate the lesson.
   */
  const context = await buildLessonContext(lessonId);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const generated = await generateLesson(context, lesson.module.courseId);

  /*
   * Persist it so refreshing/reopening does not invoke OpenAI again.
   */
  await prisma.lessonContent.create({
    data: {
      lessonId,

      content: generated as Prisma.InputJsonValue,

      generationVersion: 1,
    },
  });

  return generated;
}
