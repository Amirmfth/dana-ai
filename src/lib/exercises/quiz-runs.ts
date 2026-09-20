import { prisma } from "@/lib/db/prisma";

export async function getOrCreateCurrentQuizRun(
  userId: string,
  lessonId: string,
) {
  const existing = await prisma.quizRun.findFirst({
    where: {
      userId,
      lessonId,
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (existing) return existing;

  return prisma.quizRun.create({
    data: {
      userId,
      lessonId,
    },
  });
}

export async function startNewQuizRun(
  userId: string,
  lessonId: string,
) {
  return prisma.quizRun.create({
    data: {
      userId,
      lessonId,
    },
  });
}
