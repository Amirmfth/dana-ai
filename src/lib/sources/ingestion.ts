import { Prisma } from "@/generated/prisma/client";

import { createEmbedding } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db/prisma";
import { chunkSourceText, type TextChunk } from "@/lib/sources/chunking";
import { extractPdfSource } from "@/lib/sources/pdf";
import { deleteSourceFile, uploadSourceFile } from "@/lib/sources/storage";
import { fetchPublicSourceUrl } from "@/lib/sources/url";

function vectorToSql(vector: number[]) {
  return "[" + vector.join(",") + "]";
}

async function persistChunks({
  ownerId,
  courseId,
  sourceId,
  chunks,
}: {
  ownerId: string;
  courseId?: string;
  sourceId: string;
  chunks: TextChunk[];
}) {
  if (chunks.length === 0) {
    throw new Error("Source did not contain extractable text.");
  }

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const row = await prisma.sourceChunk.create({
      data: {
        sourceId,
        chunkIndex: index,
        content: chunk.content,
        pageStart: chunk.pageStart ?? null,
        pageEnd: chunk.pageEnd ?? null,
        heading: chunk.heading ?? null,
      },
    });

    const embedding = await createEmbedding({
      text: chunk.content,
      userId: ownerId,
      courseId,
    });
    const vector = vectorToSql(embedding);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "SourceChunk"
      SET "embedding" = ${vector}::vector
      WHERE "id" = ${row.id}
    `);
  }
}

async function createSourceRecord({
  ownerId,
  courseId,
  type,
  title,
  originalUrl,
  mimeType,
  byteSize,
}: {
  ownerId: string;
  courseId?: string;
  type: "PDF" | "TEXT" | "URL";
  title: string;
  originalUrl?: string;
  mimeType?: string;
  byteSize?: number;
}) {
  return prisma.courseSource.create({
    data: {
      ownerId,
      courseId,
      type,
      title: title.trim().slice(0, 300) || "Untitled source",
      originalUrl: originalUrl ?? null,
      mimeType: mimeType ?? null,
      byteSize: byteSize ?? null,
      status: "PROCESSING",
    },
  });
}

export async function ingestTextSource({
  ownerId, courseId, title, text,
}: { ownerId: string; courseId?: string; title: string; text: string }) {
  const source = await createSourceRecord({
    ownerId, courseId, type: "TEXT", title, mimeType: "text/plain",
    byteSize: Buffer.byteLength(text, "utf8"),
  });

  try {
    const chunks = chunkSourceText(text);
    await persistChunks({ ownerId, courseId, sourceId: source.id, chunks });
    return prisma.courseSource.update({
      where: { id: source.id },
      data: { status: "READY", metadata: { chunkCount: chunks.length } },
    });
  } catch (error) {
    await prisma.courseSource.update({
      where: { id: source.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Source ingestion failed.",
      },
    });
    throw error;
  }
}

export async function ingestUrlSource({
  ownerId, courseId, url,
}: { ownerId: string; courseId?: string; url: string }) {
  const fetched = await fetchPublicSourceUrl(url);
  const source = await createSourceRecord({
    ownerId, courseId, type: "URL", title: fetched.title,
    originalUrl: fetched.finalUrl, mimeType: "text/html",
    byteSize: Buffer.byteLength(fetched.text, "utf8"),
  });

  try {
    const chunks = chunkSourceText(fetched.text);
    await persistChunks({ ownerId, courseId, sourceId: source.id, chunks });
    return prisma.courseSource.update({
      where: { id: source.id },
      data: { status: "READY", metadata: { chunkCount: chunks.length } },
    });
  } catch (error) {
    await prisma.courseSource.update({
      where: { id: source.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Source ingestion failed.",
      },
    });
    throw error;
  }
}

export async function ingestFileSource({
  ownerId, courseId, file,
}: { ownerId: string; courseId?: string; file: File }) {
  const type = file.type === "application/pdf" ? "PDF" : "TEXT";
  const source = await createSourceRecord({
    ownerId, courseId, type, title: file.name || "Uploaded source",
    mimeType: file.type, byteSize: file.size,
  });

  let storagePath: string | null = null;

  try {
    storagePath = await uploadSourceFile(ownerId, source.id, file);
    await prisma.courseSource.update({ where: { id: source.id }, data: { storagePath } });

    const chunks = type === "PDF"
      ? (await extractPdfSource(ownerId, file, courseId)).chunks.map((chunk) => ({
          content: chunk.content,
          pageStart: chunk.pageStart ?? undefined,
          pageEnd: chunk.pageEnd ?? undefined,
          heading: chunk.heading ?? undefined,
        }))
      : chunkSourceText(await file.text());

    await persistChunks({ ownerId, courseId, sourceId: source.id, chunks });

    return prisma.courseSource.update({
      where: { id: source.id },
      data: { status: "READY", metadata: { chunkCount: chunks.length } },
    });
  } catch (error) {
    if (storagePath) await deleteSourceFile(storagePath).catch(() => null);
    await prisma.courseSource.update({
      where: { id: source.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Source ingestion failed.",
      },
    });
    throw error;
  }
}

export async function attachSourcesToCourse({
  ownerId, courseId, sourceIds,
}: { ownerId: string; courseId: string; sourceIds: string[] }) {
  const ids = [...new Set(sourceIds)];
  if (ids.length === 0) return;

  const result = await prisma.courseSource.updateMany({
    where: { id: { in: ids }, ownerId, courseId: null, status: "READY" },
    data: { courseId },
  });

  if (result.count !== ids.length) {
    throw new Error("One or more sources could not be attached to the course.");
  }
}

export async function deleteCourseSource(ownerId: string, sourceId: string) {
  const source = await prisma.courseSource.findFirst({ where: { id: sourceId, ownerId } });
  if (!source) throw new Error("Source not found.");

  if (source.storagePath) await deleteSourceFile(source.storagePath);
  await prisma.courseSource.delete({ where: { id: source.id } });
}
