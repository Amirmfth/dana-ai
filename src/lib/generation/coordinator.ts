import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import {
  GENERATION_STALE_AFTER_MS,
  GENERATION_WAIT_TIMEOUT_MS,
  safeGenerationError,
} from "@/lib/generation/state";

export type GenerationKindValue = "LESSON_CONTENT" | "LESSON_QUIZ";

export class GenerationInProgressError extends Error {
  readonly code = "GENERATION_IN_PROGRESS";

  constructor(kind: GenerationKindValue) {
    super(
      kind === "LESSON_CONTENT"
        ? "This lesson is already being generated."
        : "This quiz is already being generated.",
    );
    this.name = "GenerationInProgressError";
  }
}

export class GenerationRetryableError extends Error {
  readonly code = "GENERATION_RETRYABLE";

  constructor(kind: GenerationKindValue, cause?: string | null) {
    super(
      cause ||
        (kind === "LESSON_CONTENT"
          ? "Lesson generation failed. Please retry."
          : "Quiz generation failed. Please retry."),
    );
    this.name = "GenerationRetryableError";
  }
}

async function ensureGenerationJob(
  lessonId: string,
  kind: GenerationKindValue,
) {
  return prisma.generationJob.upsert({
    where: {
      lessonId_kind: {
        lessonId,
        kind,
      },
    },
    create: {
      lessonId,
      kind,
    },
    update: {},
  });
}

export async function claimGeneration(
  lessonId: string,
  kind: GenerationKindValue,
) {
  await ensureGenerationJob(lessonId, kind);

  await prisma.generationJob.updateMany({
    where: {
      lessonId,
      kind,
      status: "READY",
    },
    data: {
      status: "FAILED",
      stage: "FAILED",
      claimToken: null,
      errorMessage: "Generation metadata was ready but generated data was missing.",
      completedAt: null,
    },
  });

  const now = new Date();
  const staleBefore = new Date(now.getTime() - GENERATION_STALE_AFTER_MS);
  const claimToken = randomUUID();

  const claimed = await prisma.generationJob.updateMany({
    where: {
      lessonId,
      kind,
      OR: [
        {
          status: {
            in: ["NOT_STARTED", "FAILED"],
          },
        },
        {
          status: "GENERATING",
          startedAt: {
            lt: staleBefore,
          },
        },
      ],
    },
    data: {
      status: "GENERATING",
      stage: kind === "LESSON_CONTENT" ? "PREPARING_CONTEXT" : "PREPARING_QUIZ",
      claimToken,
      attemptCount: {
        increment: 1,
      },
      errorMessage: null,
      startedAt: now,
      completedAt: null,
    },
  });

  return claimed.count === 1 ? claimToken : null;
}

export async function markObservedGenerationReady(
  lessonId: string,
  kind: GenerationKindValue,
) {
  await ensureGenerationJob(lessonId, kind);

  await prisma.generationJob.updateMany({
    where: {
      lessonId,
      kind,
    },
    data: {
      status: "READY",
      stage: "READY",
      claimToken: null,
      errorMessage: null,
      completedAt: new Date(),
    },
  });
}

export async function markGenerationReady(
  lessonId: string,
  kind: GenerationKindValue,
  claimToken: string,
) {
  const result = await prisma.generationJob.updateMany({
    where: {
      lessonId,
      kind,
      status: "GENERATING",
      claimToken,
    },
    data: {
      status: "READY",
      stage: "READY",
      claimToken: null,
      errorMessage: null,
      completedAt: new Date(),
    },
  });

  return result.count === 1;
}

export async function markGenerationFailed(
  lessonId: string,
  kind: GenerationKindValue,
  claimToken: string,
  error: unknown,
) {
  await prisma.generationJob.updateMany({
    where: {
      lessonId,
      kind,
      status: "GENERATING",
      claimToken,
    },
    data: {
      status: "FAILED",
      claimToken: null,
      errorMessage: safeGenerationError(error),
      completedAt: null,
    },
  });
}

export async function waitForGeneratedValue<T>({
  lessonId,
  kind,
  load,
  timeoutMs = GENERATION_WAIT_TIMEOUT_MS,
}: {
  lessonId: string;
  kind: GenerationKindValue;
  load: () => Promise<T | null>;
  timeoutMs?: number;
}): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await load();

    if (value !== null) {
      await markObservedGenerationReady(lessonId, kind);
      return value;
    }

    const job = await prisma.generationJob.findUnique({
      where: {
        lessonId_kind: {
          lessonId,
          kind,
        },
      },
      select: {
        status: true,
        errorMessage: true,
      },
    });

    if (!job) {
      throw new GenerationRetryableError(kind);
    }

    if (job.status === "FAILED") {
      throw new GenerationRetryableError(kind, job.errorMessage);
    }

    if (job.status === "READY") {
      throw new GenerationRetryableError(
        kind,
        "Generated data could not be loaded. Please retry.",
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new GenerationInProgressError(kind);
}


export async function updateGenerationStage(
  lessonId: string,
  kind: GenerationKindValue,
  claimToken: string,
  stage: string,
) {
  await prisma.generationJob.updateMany({
    where: {
      lessonId,
      kind,
      status: "GENERATING",
      claimToken,
    },
    data: { stage },
  });
}
