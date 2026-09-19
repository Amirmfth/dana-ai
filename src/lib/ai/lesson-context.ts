import { lessonContentSchema } from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";
import { findRelevantMemories } from "../memory/vector-memory";

export async function buildLessonContext(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

    include: {
      module: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: {
                  order: "asc",
                },

                include: {
                  lessons: {
                    orderBy: {
                      order: "asc",
                    },

                    select: {
                      id: true,
                      title: true,
                      description: true,
                      objectives: true,
                      concepts: true,
                      order: true,

                      content: {
                        select: {
                          content: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const course = lesson.module.course;

  const memoryQuery = [
    lesson.title,
    lesson.description,
    ...lesson.objectives,
    ...lesson.concepts,
  ]
    .filter(Boolean)
    .join("\n");

  const relevantMemories = await findRelevantMemories({
    courseId: course.id,
    query: memoryQuery,
    limit: 8,
  });

  /*
   * Keep the roadmap, because it tells the generator where the
   * current lesson sits in the overall learning progression.
   *
   * Notice that we do NOT include generated lesson content here.
   */
  const curriculum = course.modules.map((module) => ({
    order: module.order,
    title: module.title,
    objective: module.objective,

    lessons: module.lessons.map((item) => ({
      order: item.order,
      title: item.title,
      description: item.description,
      concepts: item.concepts,
    })),
  }));

  /*
   * Collect previous generated lessons.
   *
   * Instead of passing their complete content to the model,
   * extract only their compact summaries and important concepts.
   */
  const previousLessonSummaries = course.modules
    .flatMap((module) =>
      module.lessons
        .filter((item) => {
          if (!item.content) {
            return false;
          }

          if (module.order < lesson.module.order) {
            return true;
          }

          return (
            module.order === lesson.module.order && item.order < lesson.order
          );
        })
        .map((item) => {
          const parsed = lessonContentSchema.safeParse(item.content?.content);

          if (!parsed.success) {
            return null;
          }

          return {
            title: item.title,
            summary: parsed.data.summary,
            keyTakeaways: parsed.data.keyTakeaways,
            keyConcepts: parsed.data.tutorContext.keyConcepts,
          };
        }),
    )
    .filter(
      (
        item,
      ): item is {
        title: string;
        summary: string;
        keyTakeaways: string[];
        keyConcepts: string[];
      } => item !== null,
    )
    .slice(-5);

  return {
    course: {
      title: course.title,
      description: course.description,
      goal: course.goal,
      instructions: course.instructions,
    },

    curriculum,

    currentModule: {
      title: lesson.module.title,
      description: lesson.module.description,
      objective: lesson.module.objective,
      order: lesson.module.order,
    },

    currentLesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      objectives: lesson.objectives,
      concepts: lesson.concepts,
      order: lesson.order,
    },

    previousLessonSummaries,

    learnerMemory: relevantMemories.map((memory) => ({
      type: memory.type,
      content: memory.content,
      importance: memory.importance,
      relevance: memory.similarity,
    })),
  };
}

export type LessonContext = Awaited<ReturnType<typeof buildLessonContext>>;
