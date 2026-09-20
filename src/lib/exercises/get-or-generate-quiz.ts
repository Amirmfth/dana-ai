import { generateLessonQuiz } from "@/lib/ai/quiz-generator";
import { prisma } from "@/lib/db/prisma";
import {
  claimGeneration,
  markGenerationFailed,
  markGenerationReady,
  markObservedGenerationReady,
  waitForGeneratedValue,
} from "@/lib/generation/coordinator";
import { getOrCreateCurrentQuizRun } from "@/lib/exercises/quiz-runs";
import { persistQuizVersion } from "@/lib/regeneration/quiz";

async function loadActiveQuizVersion(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { activeQuizVersionId: true },
  });
}

async function loadExercises(quizVersionId: string) {
  const exercises = await prisma.exercise.findMany({
    where: { quizVersionId },
    orderBy: { order: "asc" },
  });

  return exercises.length > 0 ? exercises : null;
}

async function loadQuizForRun(
  quizVersionId: string,
  quizRunId: string,
) {
  return prisma.exercise.findMany({
    where: { quizVersionId },
    orderBy: { order: "asc" },
    include: {
      attempts: {
        where: { quizRunId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getOrGenerateQuiz(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: { not: "LOCKED" },
      module: { course: { ownerId: userId } },
    },
    select: {
      id: true,
      activeQuizVersionId: true,
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found or locked.");
  }

  let activeQuizVersionId = lesson.activeQuizVersionId;
  const existing = activeQuizVersionId
    ? await loadExercises(activeQuizVersionId)
    : null;

  if (existing) {
    await markObservedGenerationReady(lessonId, "LESSON_QUIZ");
  } else {
    const claimToken = await claimGeneration(lessonId, "LESSON_QUIZ");

    if (!claimToken) {
      await waitForGeneratedValue({
        lessonId,
        kind: "LESSON_QUIZ",
        load: async () => {
          const current = await loadActiveQuizVersion(lessonId);
          if (!current?.activeQuizVersionId) return null;
          return loadExercises(current.activeQuizVersionId);
        },
      });

      const current = await loadActiveQuizVersion(lessonId);
      activeQuizVersionId = current?.activeQuizVersionId ?? null;
    } else {
      try {
        const quiz = await generateLessonQuiz(userId, lessonId);
        const version = await persistQuizVersion(
          lessonId,
          1,
          quiz,
        );

        activeQuizVersionId = version.id;

        await markGenerationReady(
          lessonId,
          "LESSON_QUIZ",
          claimToken,
        );
      } catch (error) {
        await markGenerationFailed(
          lessonId,
          "LESSON_QUIZ",
          claimToken,
          error,
        );
        throw error;
      }
    }
  }

  if (!activeQuizVersionId) {
    throw new Error("Quiz version could not be loaded.");
  }

  const run = await getOrCreateCurrentQuizRun(
    userId,
    lessonId,
    activeQuizVersionId,
  );

  const exercises = await loadQuizForRun(
    activeQuizVersionId,
    run.id,
  );

  return {
    run,
    exercises,
    quizVersionId: activeQuizVersionId,
  };
}
