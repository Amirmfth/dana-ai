import { getPrivacySettings } from "@/lib/ai/privacy";
import { inferExplicitLearnerMemories } from "@/lib/memory/explicit-memory";
import { extractCourseMemories } from "@/lib/ai/course-memory-extractor";
import { prisma } from "@/lib/db/prisma";
import {
  createMemoryEmbedding,
  findNearestMemory,
  isSemanticDuplicate,
  setMemoryEmbedding,
} from "@/lib/memory/vector-memory";

const MEMORY_DUPLICATE_THRESHOLD = 0.9;

function normalizeMemory(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export async function saveCourseExchangeMemories({
  userId,
  courseId,
  userMessage,
  assistantMessage,
}: {
  userId: string;
  courseId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: userId },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found.");

  const settings = await getPrivacySettings(userId);
  if (!settings.useLearnerMemory) return;

  const extracted = await extractCourseMemories({
    userId,
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
  const normalizedExisting = new Set(
    existing.map((memory) => normalizeMemory(memory.content)),
  );

  for (const memory of memories) {
    const normalized = normalizeMemory(memory.content);
    if (normalizedExisting.has(normalized)) continue;

    let embedding: number[] | null = null;
    try {
      embedding = await createMemoryEmbedding({
        content: memory.content,
        courseId,
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
        normalizedExisting.add(normalized);
        continue;
      }
    } catch (error) {
      console.error("Course memory duplicate check failed:", error);
    }

    const created = await prisma.courseMemory.create({
      data: {
        courseId,
        lessonId: null,
        type: memory.type,
        content: memory.content,
        importance: memory.importance,
        isActive: true,
      },
    });

    normalizedExisting.add(normalized);

    if (embedding) {
      try {
        await setMemoryEmbedding({
          memoryId: created.id,
          embedding,
        });
      } catch (error) {
        console.error("Failed to persist course memory embedding:", error);
      }
    }
  }
}
