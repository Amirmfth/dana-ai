import { NextRequest } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { gradeExercise } from "@/lib/exercises/grading";

type AnswerRequest = {
  exerciseId: string;
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

    if (!exerciseId || body.answer === undefined) {
      return Response.json(
        { error: "Exercise ID and answer are required." },
        { status: 400 },
      );
    }

    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        lesson: { module: { course: { ownerId: user.id } } },
      },
    });

    if (!exercise) {
      return Response.json({ error: "Exercise not found." }, { status: 404 });
    }

    const correct = gradeExercise({
      type: exercise.type,
      answerKey: exercise.answerKey,
      answer: body.answer,
    });

    const attempt = await prisma.exerciseAttempt.create({
      data: {
        exerciseId,
        answer: body.answer as Prisma.InputJsonValue,
        result: correct ? "CORRECT" : "INCORRECT",
      },
    });

    return Response.json({
      attemptId: attempt.id,
      correct,
      answerKey: exercise.answerKey,
      explanation: exercise.explanation,
    });
  } catch (error) {
    console.error("Exercise answer failed:", error);
    return Response.json({ error: "Failed to submit answer." }, { status: 500 });
  }
}
