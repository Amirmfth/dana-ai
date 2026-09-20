import { prisma } from "@/lib/db/prisma";

export async function resolveAiUsageUserId({
  userId,
  courseId,
  lessonId,
}: {
  userId?: string;
  courseId?: string;
  lessonId?: string;
}) {
  if (userId) return userId;

  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true },
    });

    if (course) return course.ownerId;
  }

  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        module: {
          select: {
            course: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (lesson) return lesson.module.course.ownerId;
  }

  throw new Error("Unable to resolve the user for AI usage tracking.");
}
