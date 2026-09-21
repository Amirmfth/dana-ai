import { getCourseAnalytics } from "@/lib/analytics/course";
import { lessonContentSchema } from "@/lib/ai/schemas/lesson";
import { prisma } from "@/lib/db/prisma";
import { findRelevantMemories } from "@/lib/memory/vector-memory";
import { findRelevantSourceChunks, sourceLocation } from "@/lib/sources/rag";

export async function buildCourseTutorContext(
  userId: string,
  courseId: string,
  query: string,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: userId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              content: { select: { content: true } },
            },
          },
        },
      },
    },
  });

  if (!course) throw new Error("Course not found.");

  const retrievalQuery = [
    query,
    course.title,
    course.goal,
  ]
    .filter(Boolean)
    .join("\n");

  const [analytics, memories, sources] = await Promise.all([
    getCourseAnalytics(userId, courseId),
    findRelevantMemories({
      courseId,
      query: retrievalQuery,
      limit: 8,
    }),
    findRelevantSourceChunks({
      ownerId: userId,
      courseId,
      query: retrievalQuery,
      limit: 8,
    }),
  ]);

  const curriculum = course.modules.map((courseModule) => ({
    id: courseModule.id,
    title: courseModule.title,
    objective: courseModule.objective,
    order: courseModule.order,
    lessons: courseModule.lessons.map((lesson) => {
      const parsed = lesson.content
        ? lessonContentSchema.safeParse(lesson.content.content)
        : null;

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        objectives: lesson.objectives,
        concepts: lesson.concepts,
        difficulty: lesson.difficulty,
        status: lesson.status,
        completionMethod: lesson.completionMethod,
        summary: parsed?.success ? parsed.data.summary : null,
      };
    }),
  }));

  return {
    course: {
      id: course.id,
      title: course.title,
      goal: course.goal,
      instructions: course.instructions,
      currentLevel: course.currentLevel,
      targetLevel: course.targetLevel,
    },
    curriculum,
    learningState: analytics
      ? {
          progress: analytics.progress,
          quizAverage: analytics.quizAverage,
          remainingMinutes: analytics.remainingMinutes,
          weakConcepts: analytics.concepts
            .filter((concept) => concept.band === "WEAKNESS")
            .slice(0, 8),
          developingConcepts: analytics.concepts
            .filter((concept) => concept.band === "DEVELOPING")
            .slice(0, 8),
          recentAssessments: analytics.advancedAssessmentRuns.slice(0, 8),
          recentActivity: analytics.events.slice(0, 10),
        }
      : null,
    learnerMemory: memories,
    sourceContext: sources.map((source, index) => ({
      marker: "[S" + (index + 1) + "]",
      sourceChunkId: source.id,
      sourceTitle: source.sourceTitle,
      location: sourceLocation(source),
      content: source.content,
    })),
  };
}

export type CourseTutorContext = Awaited<
  ReturnType<typeof buildCourseTutorContext>
>;
