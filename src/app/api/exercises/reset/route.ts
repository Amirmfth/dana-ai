import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { startNewQuizRun } from "@/lib/exercises/quiz-runs";

type ResetRequest = { lessonId: string };

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as ResetRequest;

    if (!body.lessonId) {
      return Response.json({ error: "Lesson ID is required." }, { status: 400 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: body.lessonId,
        module: { course: { ownerId: user.id } },
      },
      select: { id: true },
    });

    if (!lesson) {
      return Response.json({ error: "Lesson not found." }, { status: 404 });
    }

    const activeRuns = await prisma.quizRun.findMany({
      where: {
        userId: user.id,
        lessonId: body.lessonId,
        completedAt: null,
      },
      select: { id: true },
    });

    if (activeRuns.length > 0) {
      await prisma.quizRun.updateMany({
        where: {
          id: { in: activeRuns.map((run) => run.id) },
        },
        data: {
          completedAt: new Date(),
        },
      });
    }

    const run = await startNewQuizRun(user.id, body.lessonId);

    return Response.json({ success: true, quizRunId: run.id });
  } catch (error) {
    console.error("Quiz reset failed:", error);
    return Response.json({ error: "Failed to reset quiz." }, { status: 500 });
  }
}
