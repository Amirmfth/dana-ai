import { Prisma } from "@/generated/prisma/client";

import {
  nextStatusesAfterStructureChange,
  validateExactOrder,
} from "@/lib/courses/curriculum";
import {
  courseStructureSchema,
  type CourseStructure,
} from "@/lib/courses/structure";
import { prisma } from "@/lib/db/prisma";

export async function getOwnedCourse(userId: string, courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, ownerId: userId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
}

export async function courseToStructure(
  userId: string,
  courseId: string,
): Promise<CourseStructure> {
  const course = await getOwnedCourse(userId, courseId);

  if (!course) {
    throw new Error("Course not found.");
  }

  return {
    version: 1,
    course: {
      title: course.title,
      description: course.description,
      goal: course.goal,
      instructions: course.instructions,
      modules: course.modules.map((module) => ({
        title: module.title,
        description: module.description,
        objective: module.objective,
        lessons: module.lessons.map((lesson) => ({
          title: lesson.title,
          description: lesson.description,
          objectives: lesson.objectives,
          concepts: lesson.concepts,
        })),
      })),
    },
  };
}

export async function createCourseFromStructure(
  userId: string,
  raw: CourseStructure,
  options?: {
    titleSuffix?: string;
    prompt?: string;
  },
) {
  const structure = courseStructureSchema.parse(raw);
  const title = options?.titleSuffix
    ? structure.course.title + options.titleSuffix
    : structure.course.title;

  const course = await prisma.course.create({
    data: {
      ownerId: userId,
      title,
      description: structure.course.description,
      goal: structure.course.goal,
      instructions: structure.course.instructions,
      prompt: options?.prompt ?? "Imported curriculum structure",
      status: "ACTIVE",
      modules: {
        create: structure.course.modules.map((module, moduleIndex) => ({
          title: module.title,
          description: module.description,
          objective: module.objective,
          order: moduleIndex + 1,
          lessons: {
            create: module.lessons.map((lesson, lessonIndex) => ({
              title: lesson.title,
              description: lesson.description,
              objectives: lesson.objectives,
              concepts: lesson.concepts,
              order: lessonIndex + 1,
              status: "LOCKED",
            })),
          },
        })),
      },
    },
  });

  await normalizeCourseProgress(course.id);

  return course;
}

export async function normalizeCourseProgress(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!course) return;

  const lessons = course.modules.flatMap((module) => module.lessons);
  const statuses = nextStatusesAfterStructureChange(lessons);
  const incompleteCount = statuses.filter(
    (lesson) => lesson.status !== "COMPLETED",
  ).length;

  await prisma.$transaction([
    ...statuses.map((lesson) =>
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { status: lesson.status },
      }),
    ),
    prisma.course.update({
      where: { id: courseId },
      data: {
        status:
          course.status === "ARCHIVED"
            ? "ARCHIVED"
            : lessons.length > 0 && incompleteCount === 0
              ? "COMPLETED"
              : "ACTIVE",
      },
    }),
  ]);
}

export async function reorderModules(
  userId: string,
  courseId: string,
  orderedIds: string[],
) {
  const course = await getOwnedCourse(userId, courseId);
  if (!course) throw new Error("Course not found.");

  if (
    !validateExactOrder(
      course.modules.map((module) => module.id),
      orderedIds,
    )
  ) {
    throw new Error("Invalid module order.");
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx.module.update({
        where: { id: orderedIds[index] },
        data: { order: -(index + 1) },
      });
    }

    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx.module.update({
        where: { id: orderedIds[index] },
        data: { order: index + 1 },
      });
    }
  });

  await normalizeCourseProgress(courseId);
}

export async function reorderLessons(
  userId: string,
  moduleId: string,
  orderedIds: string[],
) {
  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      course: { ownerId: userId },
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!courseModule) throw new Error("Module not found.");

  if (
    !validateExactOrder(
      courseModule.lessons.map((lesson) => lesson.id),
      orderedIds,
    )
  ) {
    throw new Error("Invalid lesson order.");
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx.lesson.update({
        where: { id: orderedIds[index] },
        data: { order: -(index + 1) },
      });
    }

    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx.lesson.update({
        where: { id: orderedIds[index] },
        data: { order: index + 1 },
      });
    }
  });

  await normalizeCourseProgress(courseModule.courseId);
}

export async function storeTemplateFromCourse(
  userId: string,
  courseId: string,
  name?: string,
) {
  const structure = await courseToStructure(userId, courseId);

  return prisma.courseTemplate.create({
    data: {
      ownerId: userId,
      sourceCourseId: courseId,
      name: name?.trim() || structure.course.title,
      description: structure.course.description,
      structure: structure as unknown as Prisma.InputJsonValue,
    },
  });
}
