import { prisma } from "@/lib/db/prisma";

export async function getOrCreateCurrentQuizRun(
  userId: string,
  lessonId: string,
  quizVersionId: string,
) {
  const existing = await prisma.quizRun.findFirst({
    where: {
      userId,
      lessonId,
      quizVersionId,
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (existing) return existing;

  return prisma.quizRun.create({
    data: {
      userId,
      lessonId,
      quizVersionId,
    },
  });
}

export async function startNewQuizRun(
  userId: string,
  lessonId: string,
  quizVersionId: string,
) {
  return prisma.quizRun.create({
    data: {
      userId,
      lessonId,
      quizVersionId,
    },
  });
}
