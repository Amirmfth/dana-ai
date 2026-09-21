import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const user = await requireUser();
  const { lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { ownerId: user.id } },
    },
    select: {
      module: {
        select: {
          course: { select: { mode: true } },
        },
      },
      generationJobs: {
        select: {
          kind: true,
          status: true,
          stage: true,
          errorMessage: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const content = lesson.generationJobs.find((job) => job.kind === "LESSON_CONTENT");
  const quiz = lesson.generationJobs.find((job) => job.kind === "LESSON_QUIZ");

  return NextResponse.json({
    mode: lesson.module.course.mode,
    content: content ?? null,
    quiz: quiz ?? null,
  });
}
