import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db/prisma";
import { normalizeWorkspaceSearchQuery } from "@/lib/search/query";

export type WorkspaceSearchResults = Awaited<
  ReturnType<typeof searchLearningWorkspace>
>;

export async function searchLearningWorkspace(
  userId: string,
  rawQuery: string,
) {
  const query = normalizeWorkspaceSearchQuery(rawQuery);
  if (query.length < 2) {
    return {
      query,
      courses: [],
      modules: [],
      lessons: [],
      concepts: [],
      memories: [],
      sources: [],
    };
  }

  const contains = { contains: query, mode: "insensitive" as const };
  const pattern = "%" + query.replace(/[%_]/g, "\\$&") + "%";

  const [courses, modules, lessons, concepts, memories, sources] =
    await Promise.all([
      prisma.course.findMany({
        where: {
          ownerId: userId,
          OR: [
            { title: contains },
            { description: contains },
            { goal: contains },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
        },
      }),
      prisma.module.findMany({
        where: {
          course: { ownerId: userId },
          OR: [
            { title: contains },
            { description: contains },
            { objective: contains },
          ],
        },
        orderBy: [{ course: { updatedAt: "desc" } }, { order: "asc" }],
        take: 8,
        select: {
          id: true,
          title: true,
          description: true,
          course: { select: { id: true, title: true } },
        },
      }),
      prisma.lesson.findMany({
        where: {
          module: { course: { ownerId: userId } },
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: [
          { module: { course: { updatedAt: "desc" } } },
          { module: { order: "asc" } },
          { order: "asc" },
        ],
        take: 12,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          module: {
            select: {
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.$queryRaw<
        Array<{
          lessonId: string;
          lessonTitle: string;
          courseId: string;
          courseTitle: string;
          concept: string;
        }>
      >(Prisma.sql`
        SELECT
          lesson."id" AS "lessonId",
          lesson."title" AS "lessonTitle",
          course."id" AS "courseId",
          course."title" AS "courseTitle",
          concept
        FROM "Lesson" lesson
        JOIN "Module" module ON module."id" = lesson."moduleId"
        JOIN "Course" course ON course."id" = module."courseId"
        CROSS JOIN LATERAL unnest(lesson."concepts") AS concept
        WHERE
          course."ownerId" = ${userId}::uuid
          AND concept ILIKE ${pattern} ESCAPE '\\'
        ORDER BY course."updatedAt" DESC, module."order", lesson."order"
        LIMIT 12
      `),
      prisma.courseMemory.findMany({
        where: {
          course: { ownerId: userId },
          content: contains,
        },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        take: 10,
        select: {
          id: true,
          type: true,
          content: true,
          isActive: true,
          course: { select: { id: true, title: true } },
          lesson: { select: { id: true, title: true } },
        },
      }),
      prisma.courseSource.findMany({
        where: {
          ownerId: userId,
          courseId: { not: null },
          OR: [{ title: contains }, { originalUrl: contains }],
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          originalUrl: true,
          course: { select: { id: true, title: true } },
        },
      }),
    ]);

  return {
    query,
    courses,
    modules,
    lessons,
    concepts,
    memories,
    sources,
  };
}
