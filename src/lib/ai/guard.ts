import { estimateAiUsageCost } from "@/lib/ai/cost";
import { purgeExpiredAiPayloads } from "@/lib/ai/privacy";
import { prisma } from "@/lib/db/prisma";

type GuardedOperation =
  | "COURSE_GENERATION"
  | "LESSON_GENERATION"
  | "QUIZ_GENERATION"
  | "SOURCE_INGESTION"
  | "TUTOR";

const LIMITS: Record<
  GuardedOperation,
  { user: number; global: number; windowMs: number }
> = {
  COURSE_GENERATION: { user: 5, global: 25, windowMs: 60 * 60 * 1000 },
  LESSON_GENERATION: { user: 20, global: 100, windowMs: 60 * 60 * 1000 },
  QUIZ_GENERATION: { user: 30, global: 150, windowMs: 60 * 60 * 1000 },
  SOURCE_INGESTION: { user: 10, global: 50, windowMs: 60 * 60 * 1000 },
  TUTOR: { user: 60, global: 300, windowMs: 10 * 60 * 1000 },
};

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getWindowStart(windowMs: number) {
  return new Date(Math.floor(Date.now() / windowMs) * windowMs);
}

async function consumeWindow(
  scopeKey: string,
  operation: GuardedOperation,
  limit: number,
  windowMs: number,
) {
  const windowStart = getWindowStart(windowMs);

  const row = await prisma.aiRequestWindow.upsert({
    where: {
      scopeKey_operation_windowStart: {
        scopeKey,
        operation,
        windowStart,
      },
    },
    create: {
      scopeKey,
      operation,
      windowStart,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
    select: { count: true },
  });

  if (row.count > limit) {
    throw new Error("AI_RATE_LIMIT_EXCEEDED");
  }
}

async function assertBudget(userId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const [userUsage, globalUsage] = await Promise.all([
    prisma.aiUsage.findMany({
      where: { userId, createdAt: { gte: start }, status: "SUCCESS" },
      select: {
        model: true,
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
      },
    }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: start }, status: "SUCCESS" },
      select: {
        model: true,
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
      },
    }),
  ]);

  const userCost = userUsage.reduce(
    (total, usage) => total + estimateAiUsageCost(usage),
    0,
  );
  const globalCost = globalUsage.reduce(
    (total, usage) => total + estimateAiUsageCost(usage),
    0,
  );

  if (userCost >= envNumber("AI_USER_DAILY_USD_LIMIT", 2)) {
    throw new Error("AI_USER_DAILY_BUDGET_EXCEEDED");
  }

  if (globalCost >= envNumber("AI_GLOBAL_DAILY_USD_LIMIT", 20)) {
    throw new Error("AI_GLOBAL_DAILY_BUDGET_EXCEEDED");
  }
}

export async function assertAiRequestAllowed(
  userId: string,
  operation: GuardedOperation,
) {
  const config = LIMITS[operation];

  await purgeExpiredAiPayloads(userId);
  await assertBudget(userId);

  await Promise.all([
    consumeWindow("user:" + userId, operation, config.user, config.windowMs),
    consumeWindow("global", operation, config.global, config.windowMs),
  ]);
}
