import { extractMemories } from "@/lib/ai/memory-extractor";
import { prisma } from "@/lib/db/prisma";
import { embedMemory } from "./vector-memory";

export async function saveExchangeMemories({
  lessonId,
  userMessage,
  assistantMessage,
}: {
  lessonId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

    select: {
      module: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const courseId = lesson.module.courseId;

  const extracted = await extractMemories({
    lessonId,
    courseId,

    exchange: {
      user: userMessage,
      assistant: assistantMessage,
    },
  });

  if (extracted.length === 0) {
    return;
  }

  /*
   * Very basic V1 duplicate protection.
   *
   * Semantic duplicate detection comes with pgvector next.
   */
  const existing = await prisma.courseMemory.findMany({
    where: {
      courseId,
    },

    select: {
      content: true,
    },
  });

  const existingNormalized = new Set(
    existing.map((memory) => normalizeMemory(memory.content)),
  );

  const newMemories = extracted.filter(
    (memory) => !existingNormalized.has(normalizeMemory(memory.content)),
  );

  if (newMemories.length === 0) {
    return;
  }

  for (const memory of newMemories) {
    const created = await prisma.courseMemory.create({
      data: {
        courseId,
        lessonId,
        type: memory.type,
        content: memory.content,
        importance: memory.importance,
      },
    });

    try {
      await embedMemory({
        memoryId: created.id,
        content: memory.content,
        courseId,
        lessonId,
      });
    } catch (error) {
      /*
       * Memory persistence should still succeed if embedding fails.
       * We can backfill missing embeddings later.
       */
      console.error(`Failed to embed memory ${created.id}:`, error);
    }
  }
}

function normalizeMemory(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}
