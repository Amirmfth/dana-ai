import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { gradeExercise } from "@/lib/exercises/grading";
import { applyAssessmentOutcome } from "@/lib/assessments/service";

type AssessmentAnswerRequest = {
  runId: string;
  questionId: string;
  answer: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as AssessmentAnswerRequest;

    const question = await prisma.assessmentQuestion.findFirst({
      where: {
        id: body.questionId,
        assessmentVersion: {
          runs: {
            some: {
              id: body.runId,
              userId: user.id,
              completedAt: null,
            },
          },
          assessment: {
            course: { ownerId: user.id },
          },
        },
      },
    });

    if (!question) {
      return Response.json(
        { error: "Assessment question not found." },
        { status: 404 },
      );
    }

    const existing = await prisma.assessmentAnswer.findFirst({
      where: {
        assessmentRunId: body.runId,
        questionId: body.questionId,
      },
    });

    if (existing) {
      return Response.json(
        { error: "Question already answered." },
        { status: 409 },
      );
    }

    const correct = gradeExercise({
      type: question.type,
      answerKey: question.answerKey,
      answer: body.answer,
    });

    await prisma.assessmentAnswer.create({
      data: {
        assessmentRunId: body.runId,
        questionId: body.questionId,
        answer: body.answer as Prisma.InputJsonValue,
        result: correct ? "CORRECT" : "INCORRECT",
      },
    });

    const finalized = await applyAssessmentOutcome(user.id, body.runId);

    return Response.json({
      correct,
      explanation: question.explanation,
      completed: Boolean(finalized?.completedAt),
      score: finalized?.score ?? null,
      passed: finalized?.passed ?? null,
    });
  } catch (error) {
    console.error("Assessment answer failed:", error);
    return Response.json(
      { error: "Failed to submit assessment answer." },
      { status: 500 },
    );
  }
}
