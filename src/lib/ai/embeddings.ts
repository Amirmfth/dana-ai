import { openai } from "@/lib/ai/client";

export async function createEmbedding(
  text: string,
): Promise<number[]> {
  const value = text.trim();

  if (!value) {
    throw new Error("Cannot embed empty text.");
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: value,
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error("Embedding generation failed.");
  }

  return embedding;
}