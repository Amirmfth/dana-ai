import { Prisma } from "@/generated/prisma/client";

import { openai } from "@/lib/ai/client";
import { aiPayloadForStorage, getPrivacySettings } from "@/lib/ai/privacy";
import { resolveAiUsageUserId } from "@/lib/ai/usage-user";
import { prisma } from "@/lib/db/prisma";

type TrackedEmbeddingOptions = {
  input: string;
  model?: "text-embedding-3-small" | "text-embedding-3-large";
  userId?: string;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
};

export async function createTrackedEmbedding({
  input,
  model = "text-embedding-3-small",
  userId: explicitUserId,
  courseId,
  lessonId,
  conversationId,
}: TrackedEmbeddingOptions): Promise<number[]> {
  const startedAt = Date.now();
  const userId = await resolveAiUsageUserId({
    userId: explicitUserId,
    courseId,
    lessonId,
  });
  const privacy = await getPrivacySettings(userId);
  const storedInput = aiPayloadForStorage(
    { input },
    privacy,
  );

  try {
    const response = await openai.embeddings.create({ model, input });
    const embedding = response.data[0]?.embedding;

    if (!embedding) throw new Error("Embedding generation failed.");

    await prisma.aiUsage.create({
      data: {
        userId,
        operation: "EMBEDDING",
        status: "SUCCESS",
        model: response.model,
        providerResponseId: response._request_id ?? null,
        input:
          storedInput === null
            ? Prisma.DbNull
            : (storedInput as Prisma.InputJsonValue),
        inputTokens: response.usage.prompt_tokens,
        outputTokens: 0,
        totalTokens: response.usage.total_tokens,
        durationMs: Date.now() - startedAt,
        courseId,
        lessonId,
        conversationId,
      },
    });

    return embedding;
  } catch (error) {
    await prisma.aiUsage.create({
      data: {
        userId,
        operation: "EMBEDDING",
        status: "ERROR",
        model,
        input:
          storedInput === null
            ? Prisma.DbNull
            : (storedInput as Prisma.InputJsonValue),
        durationMs: Date.now() - startedAt,
        errorMessage:
          error instanceof Error ? error.message : "Unknown embedding error",
        courseId,
        lessonId,
        conversationId,
      },
    });

    throw error;
  }
}
