import { NextRequest } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { gradeExercise } from "@/lib/exercises/grading";

type AnswerRequest = {
  exerciseId: string;
  quizRunId: string;
  answer: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as AnswerRequest;
    const exerciseId = body.exerciseId?.trim();
    const quizRunId = body.quizRunId?.trim();

    if (!exerciseId || !quizRunId || body.answer === undefined) {
      return Response.json(
        { error: "Exercise ID, quiz run ID, and answer are required." },
        { status: 400 },
      );
    }

    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        lesson: { module: { course: { ownerId: user.id } } },
      },
      include: {
        lesson: {
          select: {
            id: true,
            module: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
    });

    if (!exercise) {
      return Response.json({ error: "Exercise not found." }, { status: 404 });
    }

    const run = await prisma.quizRun.findFirst({
      where: {
        id: quizRunId,
        userId: user.id,
        lessonId: exercise.lessonId,
        quizVersionId: exercise.quizVersionId,
        completedAt: null,
      },
    });

    if (!run) {
      return Response.json({ error: "Quiz run is not active." }, { status: 409 });
    }

    const previous = await prisma.exerciseAttempt.findFirst({
      where: {
        exerciseId,
        quizRunId,
      },
    });

    if (previous) {
      return Response.json(
        { error: "This question was already answered in this quiz run." },
        { status: 409 },
      );
    }

    const correct = gradeExercise({
      type: exercise.type,
      answerKey: exercise.answerKey,
      answer: body.answer,
    });

    const attempt = await prisma.exerciseAttempt.create({
      data: {
        exerciseId,
        quizRunId,
        answer: body.answer as Prisma.InputJsonValue,
        result: correct ? "CORRECT" : "INCORRECT",
      },
    });

    const [exerciseCount, attempts] = await Promise.all([
      prisma.exercise.count({
        where: { quizVersionId: exercise.quizVersionId },
      }),
      prisma.exerciseAttempt.findMany({
        where: { quizRunId },
        select: { result: true },
      }),
    ]);

    let quizCompleted = false;
    let score: number | null = null;

    if (exerciseCount > 0 && attempts.length >= exerciseCount) {
      score = attempts.filter((item) => item.result === "CORRECT").length;
      quizCompleted = true;

      await prisma.$transaction([
        prisma.quizRun.update({
          where: { id: quizRunId },
          data: {
            score,
            total: exerciseCount,
            completedAt: new Date(),
          },
        }),
        prisma.learningEvent.create({
          data: {
            userId: user.id,
            courseId: exercise.lesson.module.courseId,
            lessonId: exercise.lessonId,
            type: "QUIZ_COMPLETED",
            metadata: {
              quizRunId,
              score,
              total: exerciseCount,
            } as Prisma.InputJsonValue,
          },
        }),
      ]);
    }

    return Response.json({
      attemptId: attempt.id,
      correct,
      answerKey: exercise.answerKey,
      explanation: exercise.explanation,
      quizCompleted,
      score,
      total: quizCompleted ? exerciseCount : null,
    });
  } catch (error) {
    console.error("Exercise answer failed:", error);
    return Response.json({ error: "Failed to submit answer." }, { status: 500 });
  }
}
