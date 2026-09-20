import { Prisma } from "@/generated/prisma/client";

import { type GeneratedQuizExercise } from "@/lib/ai/schemas/quiz";
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

async function loadExercises(lessonId: string) {
  const exercises = await prisma.exercise.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  });

  return exercises.length > 0 ? exercises : null;
}

async function loadQuizForRun(lessonId: string, quizRunId: string) {
  return prisma.exercise.findMany({
    where: { lessonId },
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
    select: { id: true },
  });

  if (!lesson) {
    throw new Error("Lesson not found or locked.");
  }

  const existing = await loadExercises(lessonId);

  if (existing) {
    await markObservedGenerationReady(lessonId, "LESSON_QUIZ");
  } else {
    const claimToken = await claimGeneration(lessonId, "LESSON_QUIZ");

    if (!claimToken) {
      await waitForGeneratedValue({
        lessonId,
        kind: "LESSON_QUIZ",
        load: () => loadExercises(lessonId),
      });
    } else {
      try {
        const quiz = await generateLessonQuiz(userId, lessonId);

        await prisma.exercise.createMany({
          data: quiz.exercises.map((exercise, index) => {
            const storage = prepareExercise(exercise);

            return {
              lessonId,
              type: exercise.type,
              order: index + 1,
              question: exercise.question,
              data: storage.data as Prisma.InputJsonValue,
              answerKey: storage.answerKey as Prisma.InputJsonValue,
              explanation: exercise.explanation,
              concepts: exercise.concepts,
            };
          }),
          skipDuplicates: true,
        });

        const persisted = await loadExercises(lessonId);

        if (!persisted) {
          throw new Error("Quiz generation completed without persisted exercises.");
        }

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

  const run = await getOrCreateCurrentQuizRun(userId, lessonId);
  const exercises = await loadQuizForRun(lessonId, run.id);

  return { run, exercises };
}

function prepareExercise(exercise: GeneratedQuizExercise) {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return {
        data: { options: exercise.options },
        answerKey: { value: exercise.correctAnswer },
      };
    case "TRUE_FALSE":
      return { data: {}, answerKey: { value: exercise.correctAnswer } };
    case "MULTIPLE_SELECT":
      return {
        data: { options: exercise.options },
        answerKey: { values: exercise.correctAnswers },
      };
    case "MATCHING": {
      const pairs = exercise.pairs.map((pair, index) => ({
        left: { id: "left-" + (index + 1), label: pair.left },
        right: { id: "right-" + (index + 1), label: pair.right },
      }));

      return {
        data: {
          leftItems: pairs.map((pair) => pair.left),
          rightItems: rotate(pairs.map((pair) => pair.right)),
        },
        answerKey: {
          pairs: pairs.map((pair) => ({
            leftId: pair.left.id,
            rightId: pair.right.id,
          })),
        },
      };
    }
    case "ORDERING": {
      const correctItems = exercise.items.map((label, index) => ({
        id: "item-" + (index + 1),
        label,
      }));

      return {
        data: { items: rotate(correctItems) },
        answerKey: { order: correctItems.map((item) => item.id) },
      };
    }
  }
}

function rotate<T>(items: T[]) {
  if (items.length <= 1) return items;
  return [...items.slice(1), items[0]];
}
