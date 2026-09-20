import { Prisma } from "@/generated/prisma/client";

import { validateExactOrder } from "@/lib/courses/curriculum";
import { nextStatusesFromPrerequisites } from "@/lib/progression/prerequisites";
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
            include: {
              prerequisites: {
                select: { prerequisiteLessonId: true },
              },
            },
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
          key: lesson.id,
          title: lesson.title,
          description: lesson.description,
          objectives: lesson.objectives,
          concepts: lesson.concepts,
          difficulty: lesson.difficulty,
          isOptional: lesson.isOptional,
          prerequisiteKeys: lesson.prerequisites.map(
            (item) => item.prerequisiteLessonId,
          ),
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
              difficulty: lesson.difficulty,
              isOptional: lesson.isOptional,
              order: lessonIndex + 1,
              status: "LOCKED",
            })),
          },
        })),
      },
    },
  });

  const createdCourse = await getOwnedCourse(userId, course.id);
  if (!createdCourse) throw new Error("Created course could not be loaded.");

  const plannedLessons = structure.course.modules.flatMap(
    (courseModule) => courseModule.lessons,
  );
  const createdLessons = createdCourse.modules.flatMap(
    (courseModule) => courseModule.lessons,
  );
  const keyMap = new Map<string, string>();

  plannedLessons.forEach((lesson, index) => {
    keyMap.set(lesson.key ?? "lesson-" + (index + 1), createdLessons[index].id);
  });

  const edges = plannedLessons.flatMap((lesson, index) => {
    const lessonId = createdLessons[index].id;
    const resolved = lesson.prerequisiteKeys
      .map((key) => keyMap.get(key))
      .filter((id): id is string => Boolean(id) && id !== lessonId);

    if (resolved.length > 0) {
      return [...new Set(resolved)].map((prerequisiteLessonId) => ({
        lessonId,
        prerequisiteLessonId,
      }));
    }

    return index > 0
      ? [{
          lessonId,
          prerequisiteLessonId: createdLessons[index - 1].id,
        }]
      : [];
  });

  if (edges.length > 0) {
    await prisma.lessonPrerequisite.createMany({
      data: edges,
      skipDuplicates: true,
    });
  }

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
            include: {
              prerequisites: {
                select: { prerequisiteLessonId: true },
              },
            },
          },
          assessments: {
            where: { type: "MODULE" },
            include: {
              versions: {
                include: {
                  runs: {
                    where: {
                      userId: course.ownerId,
                      passed: true,
                      completedAt: { not: null },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      assessments: {
        where: { type: "COURSE_FINAL" },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              runs: {
                where: {
                  passed: true,
                  completedAt: { not: null },
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!course) return;

  const completed = new Set(
    course.modules
      .flatMap((courseModule) => courseModule.lessons)
      .filter((lesson) => lesson.status === "COMPLETED")
      .map((lesson) => lesson.id),
  );

  const modulePassed = course.modules.map((courseModule) =>
    Boolean(
      courseModule.assessments[0]?.versions.some(
        (version) => Boolean(version.runs[0]),
      ),
    ),
  );

  const statusUpdates: Array<{
    id: string;
    status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  }> = [];

  course.modules.forEach((courseModule, moduleIndex) => {
    const previousModulePassed =
      moduleIndex === 0 || modulePassed[moduleIndex - 1];

    for (const lesson of courseModule.lessons) {
      if (lesson.status === "COMPLETED") {
        statusUpdates.push({ id: lesson.id, status: "COMPLETED" });
        continue;
      }

      const prerequisitesSatisfied = lesson.prerequisites.every((edge) =>
        completed.has(edge.prerequisiteLessonId),
      );

      statusUpdates.push({
        id: lesson.id,
        status:
          previousModulePassed && prerequisitesSatisfied
            ? lesson.status === "IN_PROGRESS"
              ? "IN_PROGRESS"
              : "AVAILABLE"
            : "LOCKED",
      });
    }
  });

  const requiredLessons = course.modules.flatMap((courseModule) =>
    courseModule.lessons.filter((lesson) => !lesson.isOptional),
  );
  const requiredLessonsComplete = requiredLessons.every(
    (lesson) => lesson.status === "COMPLETED",
  );
  const allModuleAssessmentsPassed =
    course.modules.length > 0 && modulePassed.every(Boolean);
  const finalPassed = Boolean(
    course.assessments[0]?.versions.some(
      (version) => Boolean(version.runs[0]),
    ),
  );

  await prisma.$transaction([
    ...statusUpdates.map((lesson) =>
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
            : requiredLessonsComplete &&
                allModuleAssessmentsPassed &&
                finalPassed
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
