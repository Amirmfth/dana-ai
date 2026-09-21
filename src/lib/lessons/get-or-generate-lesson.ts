import {
  lessonContentSchema,
  type GeneratedLessonContent,
} from "@/lib/ai/schemas/lesson";
import { buildLessonContext } from "@/lib/ai/lesson-context";
import { generateLesson } from "@/lib/ai/lesson-generator";
import { prisma } from "@/lib/db/prisma";
import {
  claimGeneration,
  markGenerationFailed,
  markGenerationReady,
  markObservedGenerationReady,
  waitForGeneratedValue,
  updateGenerationStage,
} from "@/lib/generation/coordinator";
import { persistInitialLessonVersion } from "@/lib/regeneration/lesson";

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
    await updateGenerationStage(lessonId, "LESSON_CONTENT", claimToken, "PREPARING_CONTEXT");
    const context = await buildLessonContext(lessonId);

    await updateGenerationStage(lessonId, "LESSON_CONTENT", claimToken, "GENERATING_CONTENT");
    const generated = await generateLesson(
      context,
      lesson.module.courseId,
      userId,
    );
    await updateGenerationStage(lessonId, "LESSON_CONTENT", claimToken, "SAVING_CONTENT");
    const persisted = await persistInitialLessonVersion(
      userId,
      lessonId,
      generated,
    );

    await markGenerationReady(
      lessonId,
      "LESSON_CONTENT",
      claimToken,
    );

    return persisted;
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
