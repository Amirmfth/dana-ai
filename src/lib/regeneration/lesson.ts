import { Prisma } from "@/generated/prisma/client";
import { buildLessonContext } from "@/lib/ai/lesson-context";
import { generateLesson } from "@/lib/ai/lesson-generator";
import { lessonContentSchema } from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";
import { claimRegeneration, failRegeneration, finishRegeneration } from "@/lib/regeneration/locks";

async function persistCitations(
  tx: Prisma.TransactionClient,
  {
    userId,
    courseId,
    lessonContentVersionId,
    citations,
  }: {
    userId: string;
    courseId: string;
    lessonContentVersionId: string;
    citations: Array<{
      marker: string;
      sourceChunkId: string;
      location: string;
    }>;
  },
) {
  const uniqueIds = [...new Set(citations.map((citation) => citation.sourceChunkId))];
  if (uniqueIds.length === 0) return;

  const validChunks = await tx.sourceChunk.findMany({
    where: {
      id: { in: uniqueIds },
      source: {
        ownerId: userId,
        courseId,
        status: "READY",
      },
    },
    select: {
      id: true,
      module: { select: { courseId: true } },
    },
  });

  const valid = new Set(validChunks.map((chunk) => chunk.id));
  const rows = citations
    .filter((citation) => valid.has(citation.sourceChunkId))
    .filter(
      (citation, index, all) =>
        all.findIndex(
          (item) =>
            item.sourceChunkId === citation.sourceChunkId &&
            item.marker === citation.marker,
        ) === index,
    );

  if (rows.length > 0) {
    await tx.lessonCitation.createMany({
      data: rows.map((citation) => ({
        lessonContentVersionId,
        sourceChunkId: citation.sourceChunkId,
        marker: citation.marker,
        location: citation.location,
      })),
    });
  }
}

export async function persistInitialLessonVersion(userId: string, lessonId: string, generated: unknown) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { ownerId: userId } } },
    select: { id: true },
  });
  if (!lesson) throw new Error("Lesson not found.");
  const parsed = lessonContentSchema.parse(generated);
  return prisma.$transaction(async (tx) => {
    const version = await tx.lessonContentVersion.create({
      data: { lessonId, version: 1, content: parsed as Prisma.InputJsonValue },
    });
    await tx.lessonContent.upsert({
      where: { lessonId },
      create: { lessonId, content: parsed as Prisma.InputJsonValue, generationVersion: 1 },
      update: { content: parsed as Prisma.InputJsonValue, generationVersion: 1, generatedAt: new Date() },
    });
    await persistCitations(tx, {
      userId,
      courseId: lesson.module.courseId,
      lessonContentVersionId: version.id,
      citations: parsed.citations,
    });

    await tx.lesson.update({
      where: { id: lessonId },
      data: { activeContentVersionId: version.id },
    });

    return parsed;
  });
}

export async function regenerateLessonContent(userId: string, lessonId: string, instructions?: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { ownerId: userId } } },
    include: {
      module: { select: { courseId: true } },
      content: true,
      contentVersions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!lesson) throw new Error("Lesson not found.");

  const claimToken = await claimRegeneration(userId, "LESSON_CONTENT", lessonId);
  if (!claimToken) throw new Error("Lesson regeneration is already in progress.");

  try {
    const context = await buildLessonContext(lessonId);
    const generated = await generateLesson(context, lesson.module.courseId, userId);
    const nextVersion = (lesson.contentVersions[0]?.version ?? 0) + 1;
    const created = await prisma.$transaction(async (tx) => {
      const version = await tx.lessonContentVersion.create({
        data: {
          lessonId, version: nextVersion,
          content: generated as Prisma.InputJsonValue,
          instructions: instructions?.trim() || null,
        },
      });
      await tx.lessonContent.upsert({
        where: { lessonId },
        create: { lessonId, content: generated as Prisma.InputJsonValue, generationVersion: nextVersion },
        update: { content: generated as Prisma.InputJsonValue, generationVersion: nextVersion, generatedAt: new Date() },
      });
      await persistCitations(tx, {
        userId,
        courseId: lesson.module.courseId,
        lessonContentVersionId: version.id,
        citations: generated.citations,
      });

      await tx.lesson.update({
        where: { id: lessonId },
        data: { activeContentVersionId: version.id },
      });

      return version;
    });
    await finishRegeneration("LESSON_CONTENT", lessonId, claimToken);
    return created;
  } catch (error) {
    await failRegeneration("LESSON_CONTENT", lessonId, claimToken, error);
    throw error;
  }
}

export async function activateLessonContentVersion(userId: string, lessonId: string, versionId: string) {
  const version = await prisma.lessonContentVersion.findFirst({
    where: { id: versionId, lessonId, lesson: { module: { course: { ownerId: userId } } } },
  });
  if (!version) throw new Error("Lesson version not found.");
  const parsed = lessonContentSchema.parse(version.content);
  const content = parsed as Prisma.InputJsonValue;

  await prisma.$transaction([
    prisma.lessonContent.upsert({
      where: { lessonId },
      create: { lessonId, content, generationVersion: version.version },
      update: { content, generationVersion: version.version, generatedAt: new Date() },
    }),
    prisma.lesson.update({ where: { id: lessonId }, data: { activeContentVersionId: version.id } }),
  ]);
}
