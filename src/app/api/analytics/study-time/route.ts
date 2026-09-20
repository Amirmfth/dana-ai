import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

type StudyTimeRequest = {
  lessonId: string;
  seconds: number;
};

function utcDay(date = new Date()) {
  return new Date(date.toISOString().slice(0, 10) + "T00:00:00.000Z");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as StudyTimeRequest;
    const lessonId = body.lessonId?.trim();
    const requestedSeconds = Number(body.seconds);

    if (
      !lessonId ||
      !Number.isFinite(requestedSeconds) ||
      requestedSeconds <= 0
    ) {
      return Response.json(
        { error: "Lesson ID and positive seconds are required." },
        { status: 400 },
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        status: { not: "LOCKED" },
        module: { course: { ownerId: user.id } },
      },
      select: {
        id: true,
        module: { select: { courseId: true } },
      },
    });

    if (!lesson) {
      return Response.json({ error: "Lesson not found." }, { status: 404 });
    }

    const seconds = Math.min(60, Math.max(1, Math.round(requestedSeconds)));
    const day = utcDay();

    await prisma.studyTime.upsert({
      where: {
        userId_lessonId_day: {
          userId: user.id,
          lessonId,
          day,
        },
      },
      create: {
        userId: user.id,
        courseId: lesson.module.courseId,
        lessonId,
        day,
        seconds,
      },
      update: {
        seconds: { increment: seconds },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Study time tracking failed:", error);
    return Response.json({ error: "Failed to track study time." }, { status: 500 });
  }
}
