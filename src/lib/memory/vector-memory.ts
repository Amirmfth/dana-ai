import { createEmbedding } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db/prisma";
import { getPrivacySettings } from "@/lib/ai/privacy";

type RelevantMemory = {
  id: string;
  type: string;
  content: string;
  importance: number;
  similarity: number;
};

export type SemanticMemoryMatch = {
  id: string;
  content: string;
  similarity: number;
};

function vectorToSql(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export function isSemanticDuplicate(
  similarity: number,
  threshold = 0.9,
) {
  return similarity >= threshold;
}

export async function createMemoryEmbedding({
  content,
  courseId,
  lessonId,
}: {
  content: string;
  courseId: string;
  lessonId?: string;
}) {
  return createEmbedding({
    text: content,
    courseId,
    lessonId,
  });
}

export async function findNearestMemory({
  courseId,
  type,
  embedding,
}: {
  courseId: string;
  type: string;
  embedding: number[];
}): Promise<SemanticMemoryMatch | null> {
  const vector = vectorToSql(embedding);

  const rows = await prisma.$queryRaw<SemanticMemoryMatch[]>`
    SELECT
      "id",
      "content",
      1 - ("embedding" <=> ${vector}::vector) AS "similarity"
    FROM "CourseMemory"
    WHERE
      "courseId" = ${courseId}
      AND "type" = ${type}::"MemoryType"
      AND "isActive" = true
      AND "embedding" IS NOT NULL
    ORDER BY ("embedding" <=> ${vector}::vector) ASC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function setMemoryEmbedding({
  memoryId,
  embedding,
}: {
  memoryId: string;
  embedding: number[];
}) {
  const vector = vectorToSql(embedding);

  await prisma.$executeRaw`
    UPDATE "CourseMemory"
    SET "embedding" = ${vector}::vector
    WHERE "id" = ${memoryId}
  `;
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
  const embedding = await createMemoryEmbedding({
    content,
    courseId,
    lessonId,
  });

  await setMemoryEmbedding({
    memoryId,
    embedding,
  });
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
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { ownerId: true },
  });

  if (!course) return [];

  const settings = await getPrivacySettings(course.ownerId);
  if (!settings.useLearnerMemory) return [];

  const embedding = await createEmbedding({
    text: query,
    courseId,
    userId: course.ownerId,
  });

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
