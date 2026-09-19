import { createEmbedding } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db/prisma";

type RelevantMemory = {
  id: string;
  type: string;
  content: string;
  importance: number;
  similarity: number;
};

function vectorToSql(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export async function embedMemory({
  memoryId,
  content,
  courseId,
  lessonId,
}: {
  memoryId: string;
  content: string;
  courseId: string;
  lessonId?: string;
}) {
  const embedding = await createEmbedding({ text: content, courseId, lessonId });

  const vector = vectorToSql(embedding);

  await prisma.$executeRaw`
    UPDATE "CourseMemory"
    SET "embedding" = ${vector}::vector
    WHERE "id" = ${memoryId}
  `;
}

export async function findRelevantMemories({
  courseId,
  query,
  limit = 8,
}: {
  courseId: string;
  query: string;
  limit?: number;
}): Promise<RelevantMemory[]> {
  const embedding = await createEmbedding({ text: query, courseId });

  const vector = vectorToSql(embedding);

  return prisma.$queryRaw<RelevantMemory[]>`
    SELECT
      "id",
      "type"::text AS "type",
      "content",
      "importance",
      1 - ("embedding" <=> ${vector}::vector) AS "similarity"
    FROM "CourseMemory"
    WHERE
      "courseId" = ${courseId}
      AND "embedding" IS NOT NULL
    ORDER BY
      ("embedding" <=> ${vector}::vector) ASC,
      "importance" DESC
    LIMIT ${limit}
  `;
}
