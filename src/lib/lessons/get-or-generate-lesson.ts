import { Prisma } from "@/generated/prisma/client";

import { buildLessonContext } from "@/lib/ai/lesson-context";
import { generateLesson } from "@/lib/ai/lesson-generator";
import {
  lessonContentSchema,
  type GeneratedLessonContent,
} from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";

export async function getOrGenerateLesson(
  userId: string,
  lessonId: string,
): Promise<GeneratedLessonContent> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: { not: "LOCKED" },
      module: { course: { ownerId: userId } },
    },
    select: {
      module: { select: { courseId: true } },
      content: true,
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found or locked.");
  }

  if (lesson.content) {
    return lessonContentSchema.parse(lesson.content.content);
  }

  const context = await buildLessonContext(lessonId);
  const generated = await generateLesson(context, lesson.module.courseId, userId);

  await prisma.lessonContent.create({
    data: {
      lessonId,
      content: generated as Prisma.InputJsonValue,
      generationVersion: 1,
    },
  });

  return generated;
}
