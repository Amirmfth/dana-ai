import { Prisma } from "@/generated/prisma/client";

import { buildLessonContext } from "@/lib/ai/lesson-context";
import { generateLesson } from "@/lib/ai/lesson-generator";
import {
  lessonContentSchema,
  type GeneratedLessonContent,
} from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";
import {
  claimGeneration,
  markGenerationFailed,
  markGenerationReady,
  markObservedGenerationReady,
  waitForGeneratedValue,
} from "@/lib/generation/coordinator";

async function loadLessonContent(lessonId: string) {
  const existing = await prisma.lessonContent.findUnique({
    where: { lessonId },
  });

  return existing
    ? lessonContentSchema.parse(existing.content)
    : null;
}

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
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found or locked.");
  }

  const existing = await loadLessonContent(lessonId);

  if (existing) {
    await markObservedGenerationReady(lessonId, "LESSON_CONTENT");
    return existing;
  }

  const claimToken = await claimGeneration(lessonId, "LESSON_CONTENT");

  if (!claimToken) {
    return waitForGeneratedValue({
      lessonId,
      kind: "LESSON_CONTENT",
      load: () => loadLessonContent(lessonId),
    });
  }

  try {
    const context = await buildLessonContext(lessonId);
    const generated = await generateLesson(
      context,
      lesson.module.courseId,
      userId,
    );

    const persisted = await prisma.lessonContent.upsert({
      where: { lessonId },
      create: {
        lessonId,
        content: generated as Prisma.InputJsonValue,
        generationVersion: 1,
      },
      update: {},
    });

    await markGenerationReady(
      lessonId,
      "LESSON_CONTENT",
      claimToken,
    );

    return lessonContentSchema.parse(persisted.content);
  } catch (error) {
    await markGenerationFailed(
      lessonId,
      "LESSON_CONTENT",
      claimToken,
      error,
    );
    throw error;
  }
}
