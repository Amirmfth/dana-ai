import { Prisma } from "@/generated/prisma/client";
import { generateLessonQuiz } from "@/lib/ai/quiz-generator";
import type { GeneratedQuizExercise, LessonQuiz } from "@/lib/ai/schemas/quiz";
import { prisma } from "@/lib/db/prisma";
import { claimRegeneration, failRegeneration, finishRegeneration } from "@/lib/regeneration/locks";

function prepareExercise(exercise: GeneratedQuizExercise) {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE": return { data: { options: exercise.options }, answerKey: { value: exercise.correctAnswer } };
    case "TRUE_FALSE": return { data: {}, answerKey: { value: exercise.correctAnswer } };
    case "MULTIPLE_SELECT": return { data: { options: exercise.options }, answerKey: { values: exercise.correctAnswers } };
    case "MATCHING": {
      const pairs = exercise.pairs.map((pair, index) => ({
        left: { id: "left-" + (index + 1), label: pair.left },
        right: { id: "right-" + (index + 1), label: pair.right },
      }));
      return {
        data: { leftItems: pairs.map((p) => p.left), rightItems: [...pairs.map((p) => p.right).slice(1), pairs[0].right] },
        answerKey: { pairs: pairs.map((p) => ({ leftId: p.left.id, rightId: p.right.id })) },
      };
    }
    case "ORDERING": {
      const correctItems = exercise.items.map((label, index) => ({ id: "item-" + (index + 1), label }));
      return {
        data: { items: correctItems.length <= 1 ? correctItems : [...correctItems.slice(1), correctItems[0]] },
        answerKey: { order: correctItems.map((item) => item.id) },
      };
    }
  }
}

export async function persistQuizVersion(lessonId: string, versionNumber: number, quiz: LessonQuiz, instructions?: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.quizVersion.create({
      data: { lessonId, version: versionNumber, instructions: instructions?.trim() || null },
    });
    await tx.exercise.createMany({
      data: quiz.exercises.map((exercise, index) => {
        const stored = prepareExercise(exercise);
        return {
          lessonId, quizVersionId: version.id, type: exercise.type, order: index + 1,
          question: exercise.question, data: stored.data as Prisma.InputJsonValue,
          answerKey: stored.answerKey as Prisma.InputJsonValue,
          explanation: exercise.explanation, concepts: exercise.concepts,
        };
      }),
    });
    await tx.lesson.update({ where: { id: lessonId }, data: { activeQuizVersionId: version.id } });
    return version;
  });
}

export async function regenerateQuiz(userId: string, lessonId: string, instructions?: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { ownerId: userId } } },
    include: {
      module: { include: { course: { select: { mode: true } } } },
      quizVersions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!lesson) throw new Error("Lesson not found.");
  if (lesson.module.course.mode === "FLEXIBLE") {
    throw new Error("Quizzes are disabled for flexible courses.");
  }
  const claimToken = await claimRegeneration(userId, "LESSON_QUIZ", lessonId);
  if (!claimToken) throw new Error("Quiz regeneration is already in progress.");

  try {
    const quiz = await generateLessonQuiz(userId, lessonId);
    const version = await persistQuizVersion(
      lessonId,
      (lesson.quizVersions[0]?.version ?? 0) + 1,
      quiz,
      instructions,
    );
    await prisma.quizRun.updateMany({
      where: { userId, lessonId, completedAt: null },
      data: { completedAt: new Date() },
    });
    await finishRegeneration("LESSON_QUIZ", lessonId, claimToken);
    return version;
  } catch (error) {
    await failRegeneration("LESSON_QUIZ", lessonId, claimToken, error);
    throw error;
  }
}

export async function activateQuizVersion(userId: string, lessonId: string, versionId: string) {
  const version = await prisma.quizVersion.findFirst({
    where: { id: versionId, lessonId, lesson: { module: { course: { ownerId: userId } } } },
    include: {
      lesson: {
        include: {
          module: { include: { course: { select: { mode: true } } } },
        },
      },
    },
  });
  if (!version) throw new Error("Quiz version not found.");
  if (version.lesson.module.course.mode === "FLEXIBLE") {
    throw new Error("Quizzes are disabled for flexible courses.");
  }
  await prisma.$transaction([
    prisma.quizRun.updateMany({ where: { userId, lessonId, completedAt: null }, data: { completedAt: new Date() } }),
    prisma.lesson.update({ where: { id: lessonId }, data: { activeQuizVersionId: version.id } }),
  ]);
}
