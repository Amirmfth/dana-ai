import { openai } from "@/lib/ai/client";
import { prisma } from "@/lib/db/prisma";

type TrackedEmbeddingOptions = {
  input: string;
  model?: "text-embedding-3-small" | "text-embedding-3-large";
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
};

/** Embeddings use their own endpoint, but share the AI usage ledger. */
export async function createTrackedEmbedding({
  input,
  model = "text-embedding-3-small",
  courseId,
  lessonId,
  conversationId,
}: TrackedEmbeddingOptions): Promise<number[]> {
  const startedAt = Date.now();

  try {
    const response = await openai.embeddings.create({ model, input });
    const embedding = response.data[0]?.embedding;

    if (!embedding) throw new Error("Embedding generation failed.");

    await prisma.aiUsage.create({
      data: {
        operation: "EMBEDDING",
        status: "SUCCESS",
        model: response.model,
        providerResponseId: response._request_id ?? null,
        input: { input },
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
        operation: "EMBEDDING",
        status: "ERROR",
        model,
        input: { input },
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
