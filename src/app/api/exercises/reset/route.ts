import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

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

    const exercises = await prisma.exercise.findMany({
      where: { lessonId: body.lessonId },
      select: { id: true },
    });

    await prisma.exerciseAttempt.deleteMany({
      where: {
        exerciseId: { in: exercises.map((exercise) => exercise.id) },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Quiz reset failed:", error);
    return Response.json({ error: "Failed to reset quiz." }, { status: 500 });
  }
}
