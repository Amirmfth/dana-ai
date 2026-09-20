import { prisma } from "@/lib/db/prisma";
import { normalizeCourseProgress } from "@/lib/courses/management";

export async function markLessonStarted(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { ownerId: userId } },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      module: { select: { courseId: true } },
    },
  });

  if (!lesson) throw new Error("Lesson not found.");
  if (lesson.status === "COMPLETED" || lesson.status === "LOCKED") return lesson;
  if (lesson.status === "IN_PROGRESS") return lesson;

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: "IN_PROGRESS",
        startedAt: lesson.startedAt ?? now,
      },
    }),
    prisma.learningEvent.create({
      data: {
        userId,
        courseId: lesson.module.courseId,
        lessonId,
        type: "LESSON_STARTED",
      },
    }),
  ]);

  return updated;
}

export async function completeLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { ownerId: userId } },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      module: { select: { courseId: true } },
    },
  });

  if (!lesson) throw new Error("Lesson not found.");
  if (lesson.status === "LOCKED") {
    throw new Error("Locked lessons cannot be completed.");
  }

  if (lesson.status !== "COMPLETED") {
    const now = new Date();
    await prisma.$transaction([
      prisma.lesson.update({
        where: { id: lessonId },
        data: {
          status: "COMPLETED",
          completionMethod: "STUDIED",
          completedAt: lesson.completedAt ?? now,
          startedAt: lesson.startedAt ?? now,
        },
      }),
      prisma.learningEvent.create({
        data: {
          userId,
          courseId: lesson.module.courseId,
          lessonId,
          type: "LESSON_COMPLETED",
        },
      }),
    ]);

    await normalizeCourseProgress(lesson.module.courseId);
  }

  const next = await prisma.lesson.findFirst({
    where: {
      module: { courseId: lesson.module.courseId },
      status: { in: ["AVAILABLE", "IN_PROGRESS"] },
      id: { not: lessonId },
    },
    orderBy: [
      { module: { order: "asc" } },
      { order: "asc" },
    ],
    select: { id: true },
  });

  return {
    courseId: lesson.module.courseId,
    nextLessonId: next?.id ?? null,
  };
}

export async function skipOptionalLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      isOptional: true,
      status: { in: ["AVAILABLE", "IN_PROGRESS"] },
      module: { course: { ownerId: userId } },
    },
    select: {
      id: true,
      module: { select: { courseId: true } },
    },
  });

  if (!lesson) {
    throw new Error("Only available optional lessons can be skipped.");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      status: "COMPLETED",
      completionMethod: "SKIPPED",
      completedAt: new Date(),
    },
  });

  await normalizeCourseProgress(lesson.module.courseId);

  return { courseId: lesson.module.courseId };
}
