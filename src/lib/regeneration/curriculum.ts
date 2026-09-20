import { Prisma } from "@/generated/prisma/client";

import {
  regenerateCoursePlan,
  regenerateModulePlan,
} from "@/lib/ai/curriculum-regenerator";
import { getOwnedCourse, normalizeCourseProgress } from "@/lib/courses/management";
import { prisma } from "@/lib/db/prisma";
import {
  claimRegeneration,
  failRegeneration,
  finishRegeneration,
} from "@/lib/regeneration/locks";

function courseSnapshot(course: NonNullable<Awaited<ReturnType<typeof getOwnedCourse>>>) {
  return {
    title: course.title,
    description: course.description,
    goal: course.goal,
    instructions: course.instructions,
    modules: course.modules.map((courseModule) => ({
      title: courseModule.title,
      description: courseModule.description,
      objective: courseModule.objective,
      lessons: courseModule.lessons.map((lesson) => ({
        title: lesson.title,
        description: lesson.description,
        objectives: lesson.objectives,
        concepts: lesson.concepts,
      })),
    })),
  };
}

export async function createCourseRevision(userId: string, courseId: string) {
  const course = await getOwnedCourse(userId, courseId);
  if (!course) throw new Error("Course not found.");

  const claimToken = await claimRegeneration(userId, "CURRICULUM", courseId);
  if (!claimToken) throw new Error("Course regeneration is already in progress.");

  try {
    const plan = await regenerateCoursePlan(userId, courseSnapshot(course));
    const latest = await prisma.curriculumRevision.findFirst({
      where: { courseId, scope: "COURSE" },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const revision = await prisma.curriculumRevision.create({
      data: {
        courseId,
        scope: "COURSE",
        version: (latest?.version ?? 0) + 1,
        structure: plan as unknown as Prisma.InputJsonValue,
      },
    });

    await finishRegeneration("CURRICULUM", courseId, claimToken);
    return revision;
  } catch (error) {
    await failRegeneration("CURRICULUM", courseId, claimToken, error);
    throw error;
  }
}

export async function createModuleRevision(
  userId: string,
  courseId: string,
  moduleId: string,
) {
  const course = await getOwnedCourse(userId, courseId);
  if (!course) throw new Error("Course not found.");
  const courseModule = course.modules.find((item) => item.id === moduleId);
  if (!courseModule) throw new Error("Module not found.");

  const claimToken = await claimRegeneration(userId, "MODULE", moduleId);
  if (!claimToken) throw new Error("Module regeneration is already in progress.");

  try {
    const plan = await regenerateModulePlan(
      userId,
      {
        title: courseModule.title,
        description: courseModule.description,
        objective: courseModule.objective,
        lessons: courseModule.lessons.map((lesson) => ({
          title: lesson.title,
          description: lesson.description,
          objectives: lesson.objectives,
          concepts: lesson.concepts,
        })),
      },
      {
        title: course.title,
        goal: course.goal,
        instructions: course.instructions,
      },
    );

    const latest = await prisma.curriculumRevision.findFirst({
      where: { courseId, moduleId, scope: "MODULE" },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const revision = await prisma.curriculumRevision.create({
      data: {
        courseId,
        moduleId,
        scope: "MODULE",
        version: (latest?.version ?? 0) + 1,
        structure: plan as unknown as Prisma.InputJsonValue,
      },
    });

    await finishRegeneration("MODULE", moduleId, claimToken);
    return revision;
  } catch (error) {
    await failRegeneration("MODULE", moduleId, claimToken, error);
    throw error;
  }
}

async function applyModuleStructure(
  tx: Prisma.TransactionClient,
  moduleId: string,
  structure: {
    title: string;
    description: string;
    objective: string;
    lessons: Array<{
      title: string;
      description: string;
      objectives: string[];
      concepts: string[];
    }>;
  },
) {
  const existing = await tx.lesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  });

  await tx.module.update({
    where: { id: moduleId },
    data: {
      title: structure.title,
      description: structure.description,
      objective: structure.objective,
    },
  });

  for (let index = 0; index < structure.lessons.length; index += 1) {
    const proposed = structure.lessons[index];
    const current = existing[index];

    if (current) {
      await tx.lesson.update({
        where: { id: current.id },
        data: {
          title: proposed.title,
          description: proposed.description,
          objectives: proposed.objectives,
          concepts: proposed.concepts,
        },
      });
    } else {
      await tx.lesson.create({
        data: {
          moduleId,
          order: existing.length + (index - existing.length) + 1,
          title: proposed.title,
          description: proposed.description,
          objectives: proposed.objectives,
          concepts: proposed.concepts,
          status: "LOCKED",
        },
      });
    }
  }
}

export async function applyCurriculumRevision(
  userId: string,
  revisionId: string,
) {
  const revision = await prisma.curriculumRevision.findFirst({
    where: {
      id: revisionId,
      status: "DRAFT",
      course: { ownerId: userId },
    },
  });
  if (!revision) throw new Error("Curriculum revision not found.");

  if (revision.scope === "MODULE") {
    if (!revision.moduleId) throw new Error("Module revision is missing its module.");
    const structure = revision.structure as {
      title: string;
      description: string;
      objective: string;
      lessons: Array<{
        title: string;
        description: string;
        objectives: string[];
        concepts: string[];
      }>;
    };

    await prisma.$transaction(async (tx) => {
      await applyModuleStructure(tx, revision.moduleId!, structure);
      await tx.curriculumRevision.update({
        where: { id: revision.id },
        data: { status: "APPLIED", appliedAt: new Date() },
      });
    });
  } else {
    const structure = revision.structure as {
      title: string;
      description: string;
      goal: string;
      modules: Array<{
        title: string;
        description: string;
        objective: string;
        lessons: Array<{
          title: string;
          description: string;
          objectives: string[];
          concepts: string[];
        }>;
      }>;
    };

    await prisma.$transaction(async (tx) => {
      const existingModules = await tx.module.findMany({
        where: { courseId: revision.courseId },
        orderBy: { order: "asc" },
      });

      await tx.course.update({
        where: { id: revision.courseId },
        data: {
          title: structure.title,
          description: structure.description,
          goal: structure.goal,
        },
      });

      for (let index = 0; index < structure.modules.length; index += 1) {
        const proposed = structure.modules[index];
        const current = existingModules[index];

        if (current) {
          await applyModuleStructure(tx, current.id, proposed);
        } else {
          const created = await tx.module.create({
            data: {
              courseId: revision.courseId,
              order: existingModules.length + (index - existingModules.length) + 1,
              title: proposed.title,
              description: proposed.description,
              objective: proposed.objective,
            },
          });
          await applyModuleStructure(tx, created.id, proposed);
        }
      }

      await tx.curriculumRevision.update({
        where: { id: revision.id },
        data: { status: "APPLIED", appliedAt: new Date() },
      });
    });
  }

  await normalizeCourseProgress(revision.courseId);
}
