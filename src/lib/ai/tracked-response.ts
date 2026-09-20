import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { Prisma } from "@/generated/prisma/client";

import { assertAiRequestAllowed } from "@/lib/ai/guard";
import { aiPayloadForStorage, getPrivacySettings } from "@/lib/ai/privacy";
import { resolveAiUsageUserId } from "@/lib/ai/usage-user";
import { openai } from "@/lib/ai/client";
import { prisma } from "@/lib/db/prisma";

type AiOperation =
  | "COURSE_GENERATION"
  | "LESSON_GENERATION"
  | "TUTOR"
  | "MEMORY_EXTRACTION"
  | "QUIZ_GENERATION"
  | "SOURCE_INGESTION";

type TrackedResponseOptions = {
  operation: AiOperation;
  model: string;
  input: Parameters<typeof openai.responses.create>[0]["input"];
  reasoning?: {
    effort: "none" | "low" | "medium" | "high" | "xhigh";
  };
  text?: Parameters<typeof openai.responses.create>[0]["text"];
  userId?: string;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
};

const guardedOperations = new Set<AiOperation>([
  "COURSE_GENERATION",
  "LESSON_GENERATION",
  "TUTOR",
  "QUIZ_GENERATION",
  "SOURCE_INGESTION",
]);

async function contextFor(options: TrackedResponseOptions) {
  const userId = await resolveAiUsageUserId(options);
  const privacy = await getPrivacySettings(userId);

  if (guardedOperations.has(options.operation)) {
    await assertAiRequestAllowed(
      userId,
      options.operation as
        | "COURSE_GENERATION"
        | "LESSON_GENERATION"
        | "QUIZ_GENERATION"
        | "SOURCE_INGESTION"
        | "TUTOR",
    );
  }

  return { userId, privacy };
}

async function saveSuccess({
  response,
  startedAt,
  options,
  userId,
  storeAiPayloads,
}: {
  response: OpenAIResponse;
  startedAt: number;
  options: TrackedResponseOptions;
  userId: string;
  storeAiPayloads: boolean;
}) {
  const input = aiPayloadForStorage(
    JSON.parse(JSON.stringify(options.input)),
    { storeAiPayloads, retentionDays: 30 },
  );

  await prisma.aiUsage.create({
    data: {
      userId,
      operation: options.operation,
      status: "SUCCESS",
      model: options.model,
      providerResponseId: response.id,
      input: input === null ? Prisma.DbNull : (input as Prisma.InputJsonValue),
      output: storeAiPayloads ? response.output_text || null : null,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      totalTokens: response.usage?.total_tokens ?? null,
      cachedInputTokens:
        response.usage?.input_tokens_details?.cached_tokens ?? null,
      reasoningTokens:
        response.usage?.output_tokens_details?.reasoning_tokens ?? null,
      durationMs: Date.now() - startedAt,
      courseId: options.courseId,
      lessonId: options.lessonId,
      conversationId: options.conversationId,
    },
  });
}

async function saveError({
  error,
  startedAt,
  options,
  userId,
  storeAiPayloads,
}: {
  error: unknown;
  startedAt: number;
  options: TrackedResponseOptions;
  userId: string;
  storeAiPayloads: boolean;
}) {
  const input = aiPayloadForStorage(
    JSON.parse(JSON.stringify(options.input)),
    { storeAiPayloads, retentionDays: 30 },
  );

  await prisma.aiUsage.create({
    data: {
      userId,
      operation: options.operation,
      status: "ERROR",
      model: options.model,
      input: input === null ? Prisma.DbNull : (input as Prisma.InputJsonValue),
      durationMs: Date.now() - startedAt,
      errorMessage:
        error instanceof Error ? error.message : "Unknown AI request error",
      courseId: options.courseId,
      lessonId: options.lessonId,
      conversationId: options.conversationId,
    },
  });
}

export async function createTrackedResponse(options: TrackedResponseOptions) {
  const startedAt = Date.now();
  const { userId, privacy } = await contextFor(options);

  try {
    const response = await openai.responses.create({
      model: options.model,
      input: options.input,
      reasoning: options.reasoning,
      text: options.text,
    });

    await saveSuccess({
      response,
      startedAt,
      options,
      userId,
      storeAiPayloads: privacy.storeAiPayloads,
    });

    return response;
  } catch (error) {
    await saveError({
      error,
      startedAt,
      options,
      userId,
      storeAiPayloads: privacy.storeAiPayloads,
    });
    throw error;
  }
}

export async function createTrackedResponseStream(options: TrackedResponseOptions) {
  const startedAt = Date.now();
  const { userId, privacy } = await contextFor(options);

  try {
    const stream = await openai.responses.create({
      model: options.model,
      input: options.input,
      reasoning: options.reasoning,
      text: options.text,
      stream: true,
    });

    let tracked = false;

    return {
      stream,
      async complete(response: OpenAIResponse) {
        if (tracked) return;
        tracked = true;
        await saveSuccess({
          response,
          startedAt,
          options,
          userId,
          storeAiPayloads: privacy.storeAiPayloads,
        });
      },
      async fail(error: unknown) {
        if (tracked) return;
        tracked = true;
        await saveError({
          error,
          startedAt,
          options,
          userId,
          storeAiPayloads: privacy.storeAiPayloads,
        });
      },
    };
  } catch (error) {
    await saveError({
      error,
      startedAt,
      options,
      userId,
      storeAiPayloads: privacy.storeAiPayloads,
    });
    throw error;
  }
}
