import { NextRequest } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { gradeExercise } from "@/lib/exercises/grading";

type SubmittedAnswer = {
  exerciseId: string;
  answer: unknown;
};

type SubmitQuizRequest = {
  quizRunId: string;
  answers: SubmittedAnswer[];
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as SubmitQuizRequest;
    const quizRunId = body.quizRunId?.trim();
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (!quizRunId || answers.length === 0) {
      return Response.json(
        { error: "Quiz run and answers are required." },
        { status: 400 },
      );
    }

    const run = await prisma.quizRun.findFirst({
      where: {
        id: quizRunId,
        userId: user.id,
        completedAt: null,
      },
      include: {
        lesson: {
          select: {
            id: true,
            activeQuizVersionId: true,
            module: {
              select: {
                courseId: true,
                course: { select: { mode: true } },
              },
            },
          },
        },
      },
    });

    if (!run) {
      return Response.json(
        { error: "Quiz run is not active." },
        { status: 409 },
      );
    }

    if (run.lesson.module.course.mode === "FLEXIBLE") {
      return Response.json(
        { error: "Quizzes are disabled for flexible courses." },
        { status: 409 },
      );
    }

    if (run.lesson.activeQuizVersionId !== run.quizVersionId) {
      return Response.json(
        { error: "The quiz changed. Start a new quiz run." },
        { status: 409 },
      );
    }

    const exercises = await prisma.exercise.findMany({
      where: {
        lessonId: run.lessonId,
        quizVersionId: run.quizVersionId,
      },
      orderBy: { order: "asc" },
    });

    if (exercises.length === 0) {
      return Response.json({ error: "Quiz has no questions." }, { status: 409 });
    }

    const submittedById = new Map<string, unknown>();
    for (const item of answers) {
      if (
        !item ||
        typeof item.exerciseId !== "string" ||
        item.answer === undefined ||
        submittedById.has(item.exerciseId)
      ) {
        return Response.json(
          { error: "Every question must have exactly one submitted answer." },
          { status: 400 },
        );
      }
      submittedById.set(item.exerciseId, item.answer);
    }

    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    if (
      submittedById.size !== exercises.length ||
      [...submittedById.keys()].some((id) => !exerciseIds.has(id))
    ) {
      return Response.json(
        { error: "Answer every question before submitting the quiz." },
        { status: 400 },
      );
    }

    const graded = exercises.map((exercise) => {
      const answer = submittedById.get(exercise.id);
      const correct = gradeExercise({
        type: exercise.type,
        answerKey: exercise.answerKey,
        answer,
      });

      return {
        exercise,
        answer,
        correct,
      };
    });

    const score = graded.filter((item) => item.correct).length;
    const total = graded.length;

    await prisma.$transaction(async (tx) => {
      const activeRun = await tx.quizRun.findFirst({
        where: {
          id: quizRunId,
          userId: user.id,
          completedAt: null,
          quizVersionId: run.quizVersionId,
          lessonId: run.lessonId,
        },
        select: { id: true },
      });

      if (!activeRun) {
        throw new Error("QUIZ_RUN_NOT_ACTIVE");
      }

      await tx.exerciseAttempt.deleteMany({
        where: { quizRunId },
      });

      await tx.exerciseAttempt.createMany({
        data: graded.map(({ exercise, answer, correct }) => ({
          exerciseId: exercise.id,
          quizRunId,
          answer: answer as Prisma.InputJsonValue,
          result: correct ? "CORRECT" : "INCORRECT",
        })),
      });

      await tx.quizRun.update({
        where: { id: quizRunId },
        data: {
          score,
          total,
          completedAt: new Date(),
        },
      });

      await tx.learningEvent.create({
        data: {
          userId: user.id,
          courseId: run.lesson.module.courseId,
          lessonId: run.lessonId,
          type: "QUIZ_COMPLETED",
          metadata: {
            quizRunId,
            score,
            total,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return Response.json({
      quizCompleted: true,
      score,
      total,
      results: graded.map(({ exercise, answer, correct }) => ({
        exerciseId: exercise.id,
        answer,
        correct,
        answerKey: exercise.answerKey,
        explanation: exercise.explanation,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "QUIZ_RUN_NOT_ACTIVE") {
      return Response.json(
        { error: "Quiz run is no longer active." },
        { status: 409 },
      );
    }

    console.error("Quiz submission failed:", error);
    return Response.json({ error: "Failed to submit quiz." }, { status: 500 });
  }
}
