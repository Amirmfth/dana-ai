import { extractMemories } from "@/lib/ai/memory-extractor";
import { prisma } from "@/lib/db/prisma";
import { getPrivacySettings } from "@/lib/ai/privacy";
import { inferExplicitLearnerMemories } from "@/lib/memory/explicit-memory";
import {
  createMemoryEmbedding,
  findNearestMemory,
  isSemanticDuplicate,
  setMemoryEmbedding,
} from "./vector-memory";

const MEMORY_DUPLICATE_THRESHOLD = 0.9;

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
    where: { id: lessonId },
    select: {
      module: {
        select: {
          course: {
            select: {
              id: true,
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const courseId = lesson.module.course.id;
  const settings = await getPrivacySettings(lesson.module.course.ownerId);
  if (!settings.useLearnerMemory) return;

  const extracted = await extractMemories({
    lessonId,
    courseId,
    exchange: {
      user: userMessage,
      assistant: assistantMessage,
    },
  });

  const memories =
    extracted.length > 0
      ? extracted
      : inferExplicitLearnerMemories(userMessage);

  if (memories.length === 0) return;

  const existing = await prisma.courseMemory.findMany({
    where: { courseId, isActive: true },
    select: { content: true },
  });

  const existingNormalized = new Set(
    existing.map((memory) => normalizeMemory(memory.content)),
  );

  for (const memory of memories) {
    const normalized = normalizeMemory(memory.content);

    if (existingNormalized.has(normalized)) {
      continue;
    }

    let embedding: number[] | null = null;

    try {
      embedding = await createMemoryEmbedding({
        content: memory.content,
        courseId,
        lessonId,
      });

      const nearest = await findNearestMemory({
        courseId,
        type: memory.type,
        embedding,
      });

      if (
        nearest &&
        isSemanticDuplicate(
          nearest.similarity,
          MEMORY_DUPLICATE_THRESHOLD,
        )
      ) {
        existingNormalized.add(normalized);
        continue;
      }
    } catch (error) {
      console.error(
        "Semantic memory duplicate check failed:",
        error,
      );
    }

    const created = await prisma.courseMemory.create({
      data: {
        courseId,
        lessonId,
        type: memory.type,
        content: memory.content,
        importance: memory.importance,
        isActive: true,
      },
    });

    existingNormalized.add(normalized);

    if (!embedding) continue;

    try {
      await setMemoryEmbedding({
        memoryId: created.id,
        embedding,
      });
    } catch (error) {
      console.error(
        "Failed to persist memory embedding:",
        error,
      );
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
