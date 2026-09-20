import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export type RegenerationTargetValue =
  | "LESSON_CONTENT"
  | "LESSON_QUIZ"
  | "CURRICULUM"
  | "MODULE";

const STALE_AFTER_MS = 10 * 60 * 1000;

export async function claimRegeneration(ownerId: string, target: RegenerationTargetValue, targetId: string) {
  await prisma.regenerationLock.upsert({
    where: { target_targetId: { target, targetId } },
    create: { ownerId, target, targetId },
    update: { ownerId },
  });
  const claimToken = randomUUID();
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  const claimed = await prisma.regenerationLock.updateMany({
    where: {
      target, targetId,
      OR: [
        { status: { in: ["NOT_STARTED", "READY", "FAILED"] } },
        { status: "GENERATING", startedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: "GENERATING", claimToken, errorMessage: null,
      startedAt: new Date(), completedAt: null,
    },
  });
  return claimed.count === 1 ? claimToken : null;
}

export async function finishRegeneration(target: RegenerationTargetValue, targetId: string, claimToken: string) {
  await prisma.regenerationLock.updateMany({
    where: { target, targetId, claimToken, status: "GENERATING" },
    data: { status: "READY", claimToken: null, errorMessage: null, completedAt: new Date() },
  });
}

export async function failRegeneration(target: RegenerationTargetValue, targetId: string, claimToken: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown regeneration error";
  await prisma.regenerationLock.updateMany({
    where: { target, targetId, claimToken, status: "GENERATING" },
    data: { status: "FAILED", claimToken: null, errorMessage: message.slice(0, 2000) },
  });
}
