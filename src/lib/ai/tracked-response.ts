import { prisma } from "@/lib/db/prisma";
import { openai } from "@/lib/ai/client";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";

type AiOperation =
  | "COURSE_GENERATION"
  | "LESSON_GENERATION"
  | "TUTOR"
  | "MEMORY_EXTRACTION";

type TrackedResponseOptions = {
  operation: AiOperation;

  model: string;

  input: Parameters<typeof openai.responses.create>[0]["input"];

  reasoning?: {
    effort: "none" | "low" | "medium" | "high" | "xhigh";
  };

  text?: Parameters<typeof openai.responses.create>[0]["text"];

  courseId?: string;
  lessonId?: string;
  conversationId?: string;
};

type CompletedResponse = Awaited<ReturnType<typeof openai.responses.create>>;

async function saveSuccess({
  response,
  startedAt,
  operation,
  model,
  input,
  courseId,
  lessonId,
  conversationId,
}: {
  response: OpenAIResponse;
  startedAt: number;
  operation: AiOperation;
  model: string;
  input: TrackedResponseOptions["input"];
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
}) {
  const durationMs = Date.now() - startedAt;

  await prisma.aiUsage.create({
    data: {
      operation,
      status: "SUCCESS",

      model,

      providerResponseId: response.id,

      input: JSON.parse(JSON.stringify(input)),

      output: response.output_text || null,

      inputTokens: response.usage?.input_tokens ?? null,

      outputTokens: response.usage?.output_tokens ?? null,

      totalTokens: response.usage?.total_tokens ?? null,

      cachedInputTokens:
        response.usage?.input_tokens_details?.cached_tokens ?? null,

      reasoningTokens:
        response.usage?.output_tokens_details?.reasoning_tokens ?? null,

      durationMs,

      courseId,
      lessonId,
      conversationId,
    },
  });
}

async function saveError({
  error,
  startedAt,
  operation,
  model,
  input,
  courseId,
  lessonId,
  conversationId,
}: {
  error: unknown;
  startedAt: number;
  operation: AiOperation;
  model: string;
  input: TrackedResponseOptions["input"];
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
}) {
  const durationMs = Date.now() - startedAt;

  await prisma.aiUsage.create({
    data: {
      operation,
      status: "ERROR",

      model,

      input: JSON.parse(JSON.stringify(input)),

      durationMs,

      errorMessage:
        error instanceof Error ? error.message : "Unknown AI request error",

      courseId,
      lessonId,
      conversationId,
    },
  });
}

export async function createTrackedResponse({
  operation,
  model,
  input,
  reasoning,
  text,
  courseId,
  lessonId,
  conversationId,
}: TrackedResponseOptions) {
  const startedAt = Date.now();

  try {
    const response = await openai.responses.create({
      model,
      input,
      reasoning,
      text,
    });

    await saveSuccess({
      response,
      startedAt,
      operation,
      model,
      input,
      courseId,
      lessonId,
      conversationId,
    });

    return response;
  } catch (error) {
    await saveError({
      error,
      startedAt,
      operation,
      model,
      input,
      courseId,
      lessonId,
      conversationId,
    });

    throw error;
  }
}

export async function createTrackedResponseStream({
  operation,
  model,
  input,
  reasoning,
  text,
  courseId,
  lessonId,
  conversationId,
}: TrackedResponseOptions) {
  const startedAt = Date.now();

  try {
    const stream = await openai.responses.create({
      model,
      input,
      reasoning,
      text,
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
          operation,
          model,
          input,
          courseId,
          lessonId,
          conversationId,
        });
      },

      async fail(error: unknown) {
        if (tracked) return;

        tracked = true;

        await saveError({
          error,
          startedAt,
          operation,
          model,
          input,
          courseId,
          lessonId,
          conversationId,
        });
      },
    };
  } catch (error) {
    await saveError({
      error,
      startedAt,
      operation,
      model,
      input,
      courseId,
      lessonId,
      conversationId,
    });

    throw error;
  }
}
