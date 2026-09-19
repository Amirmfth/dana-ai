import { createTrackedEmbedding } from "@/lib/ai/tracked-embedding";

export async function createEmbedding({
  text,
  courseId,
  lessonId,
  conversationId,
}: {
  text: string;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
}): Promise<number[]> {
  const value = text.trim();

  if (!value) {
    throw new Error("Cannot embed empty text.");
  }

  return createTrackedEmbedding({ input: value, courseId, lessonId, conversationId });
}
