import { Prisma } from "@/generated/prisma/client";

import { createEmbedding } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db/prisma";

export type SourceChunkMatch = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  originalUrl: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  heading: string | null;
  similarity: number;
};

function vectorToSql(vector: number[]) {
  return "[" + vector.join(",") + "]";
}

async function nearestForSource({
  ownerId,
  sourceId,
  vector,
  limit,
}: {
  ownerId: string;
  sourceId: string;
  vector: string;
  limit: number;
}) {
  return prisma.$queryRaw<SourceChunkMatch[]>(Prisma.sql`
    SELECT
      chunk."id",
      chunk."sourceId",
      source."title" AS "sourceTitle",
      source."type"::text AS "sourceType",
      source."originalUrl",
      chunk."content",
      chunk."pageStart",
      chunk."pageEnd",
      chunk."heading",
      1 - (chunk."embedding" <=> ${vector}::vector) AS "similarity"
    FROM "SourceChunk" chunk
    JOIN "CourseSource" source ON source."id" = chunk."sourceId"
    WHERE
      source."ownerId" = ${ownerId}::uuid
      AND source."id" = ${sourceId}
      AND source."status" = 'READY'::"SourceStatus"
      AND chunk."embedding" IS NOT NULL
    ORDER BY chunk."embedding" <=> ${vector}::vector
    LIMIT ${limit}
  `);
}

export async function findRelevantSourceChunks({
  ownerId,
  query,
  courseId,
  sourceIds,
  limit = 12,
}: {
  ownerId: string;
  query: string;
  courseId?: string;
  sourceIds?: string[];
  limit?: number;
}) {
  if (sourceIds?.length) {
    const readyCount = await prisma.courseSource.count({
      where: {
        id: { in: [...new Set(sourceIds)] },
        ownerId,
        status: "READY",
      },
    });
    if (readyCount === 0) return [];
  } else if (courseId) {
    const readyCount = await prisma.courseSource.count({
      where: { courseId, ownerId, status: "READY" },
    });
    if (readyCount === 0) return [];
  } else {
    return [];
  }

  const embedding = await createEmbedding({
    text: query,
    userId: ownerId,
    courseId,
  });
  const vector = vectorToSql(embedding);

  if (sourceIds?.length) {
    const perSource = Math.max(2, Math.ceil(limit / sourceIds.length) + 1);
    const batches = await Promise.all(
      [...new Set(sourceIds)].map((sourceId) =>
        nearestForSource({ ownerId, sourceId, vector, limit: perSource }),
      ),
    );

    return batches
      .flat()
      .sort((a, b) => Number(b.similarity) - Number(a.similarity))
      .slice(0, limit);
  }

  if (!courseId) return [];

  return prisma.$queryRaw<SourceChunkMatch[]>(Prisma.sql`
    SELECT
      chunk."id",
      chunk."sourceId",
      source."title" AS "sourceTitle",
      source."type"::text AS "sourceType",
      source."originalUrl",
      chunk."content",
      chunk."pageStart",
      chunk."pageEnd",
      chunk."heading",
      1 - (chunk."embedding" <=> ${vector}::vector) AS "similarity"
    FROM "SourceChunk" chunk
    JOIN "CourseSource" source ON source."id" = chunk."sourceId"
    WHERE
      source."ownerId" = ${ownerId}::uuid
      AND source."courseId" = ${courseId}
      AND source."status" = 'READY'::"SourceStatus"
      AND chunk."embedding" IS NOT NULL
    ORDER BY chunk."embedding" <=> ${vector}::vector
    LIMIT ${limit}
  `);
}

export function sourceLocation(match: {
  sourceTitle: string;
  pageStart: number | null;
  pageEnd: number | null;
  heading: string | null;
}) {
  const parts = [match.sourceTitle];
  if (match.heading) parts.push(match.heading);

  if (match.pageStart) {
    parts.push(
      match.pageEnd && match.pageEnd !== match.pageStart
        ? "pages " + match.pageStart + "–" + match.pageEnd
        : "page " + match.pageStart,
    );
  }

  return parts.join(" · ");
}
