import {
  createTrackedEmbedding,
  createTrackedEmbeddings,
} from "@/lib/ai/tracked-embedding";

export async function createEmbedding({
  text,
  courseId,
  lessonId,
  conversationId,
  userId,
}: {
  text: string;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
  userId?: string;
}): Promise<number[]> {
  const value = text.trim();

  if (!value) {
    throw new Error("Cannot embed empty text.");
  }

  return createTrackedEmbedding({
    input: value,
    courseId,
    lessonId,
    conversationId,
    userId,
  });
}


export async function createEmbeddings({
  texts,
  courseId,
  userId,
}: {
  texts: string[];
  courseId?: string;
  userId?: string;
}) {
  const values = texts.map((text) => text.trim()).filter(Boolean);
  if (values.length === 0) return [];

  return createTrackedEmbeddings({
    inputs: values,
    courseId,
    userId,
  });
}
