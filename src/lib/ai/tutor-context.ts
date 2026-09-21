import { lessonContentSchema } from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";
import { findRelevantSourceChunks, sourceLocation } from "@/lib/sources/rag";
import { getPrivacySettings } from "@/lib/ai/privacy";

export async function buildTutorContext(
  lessonId: string,
  query?: string,
) {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

    select: {
      title: true,
      description: true,
      objectives: true,
      concepts: true,

      module: {
        select: {
          title: true,
          objective: true,

          course: {
            select: {
              id: true,
              ownerId: true,
              title: true,
              goal: true,
              instructions: true,
            },
          },
        },
      },

      content: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  if (!lesson.content) {
    throw new Error("Lesson content has not been generated.");
  }

  /*
   * Existing lessons generated before tutorContext was introduced
   * may not match the latest schema.
   *
   * safeParse lets us gracefully fall back.
   */
  const parsed = lessonContentSchema.safeParse(lesson.content.content);

  const generatedContent = parsed.success ? parsed.data : null;

  const sourceQuery = [
    query,
    lesson.title,
    lesson.description,
    ...lesson.objectives,
    ...lesson.concepts,
  ]
    .filter(Boolean)
    .join("\n");

  const privacy = await getPrivacySettings(lesson.module.course.ownerId);

  const [memories, relevantSources] = await Promise.all([
    privacy.useLearnerMemory
      ? prisma.courseMemory.findMany({
    where: {
      courseId: lesson.module.course.id,
      isActive: true,
    },

    orderBy: [
      {
        importance: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],

    take: 10,

      select: {
        type: true,
        content: true,
        importance: true,
      },
    })
      : Promise.resolve([]),
    findRelevantSourceChunks({
      ownerId: lesson.module.course.ownerId,
      courseId: lesson.module.course.id,
      query: sourceQuery,
      limit: 8,
    }),
  ]);

  return {
    course: {
      title: lesson.module.course.title,
      goal: lesson.module.course.goal,
      instructions: lesson.module.course.instructions,
    },

    module: {
      title: lesson.module.title,
      objective: lesson.module.objective,
    },

    lesson: {
      title: lesson.title,
      description: lesson.description,
      objectives: lesson.objectives,
      concepts: lesson.concepts,
    },

    lessonSummary: generatedContent?.summary ?? null,

    keyTakeaways: generatedContent?.keyTakeaways ?? [],

    tutorContext: generatedContent?.tutorContext ?? {
      keyConcepts: lesson.concepts,
      definitions: [],
      examplesCovered: [],
      commonMistakes: [],
      assumedKnowledge: [],
    },
    learnerMemory: memories,
    sourceContext: relevantSources.map((source, index) => ({
      marker: "[S" + (index + 1) + "]",
      sourceChunkId: source.id,
      sourceTitle: source.sourceTitle,
      location: sourceLocation(source),
      content: source.content,
    })),
  };
}

export type TutorContext = Awaited<ReturnType<typeof buildTutorContext>>;
