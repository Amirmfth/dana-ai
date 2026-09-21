"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import {
  courseToStructure,
  createCourseFromStructure,
  getOwnedCourse,
  normalizeCourseProgress,
  reorderLessons,
  reorderModules,
  storeTemplateFromCourse,
} from "@/lib/courses/management";
import {
  courseStructureSchema,
  parseLineList,
  parseNullableText,
} from "@/lib/courses/structure";
import { prisma } from "@/lib/db/prisma";
import { hasPrerequisiteCycle } from "@/lib/progression/prerequisites";
import { deleteSourceFile } from "@/lib/sources/storage";

function requiredText(
  value: FormDataEntryValue | null,
  label: string,
  maxLength: number,
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(label + " is required.");
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(label + " is too long.");
  }

  return normalized;
}

function revalidateCourse(courseId: string) {
  revalidatePath("/");
  revalidatePath("/courses/" + courseId);
  revalidatePath("/courses/" + courseId + "/manage");
}

export async function updateCourseAction(
  courseId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const course = await getOwnedCourse(user.id, courseId);
  if (!course) throw new Error("Course not found.");

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: requiredText(formData.get("title"), "Title", 200),
      description: parseNullableText(formData.get("description"), 2000),
      goal: requiredText(formData.get("goal"), "Goal", 4000),
      instructions: parseNullableText(formData.get("instructions"), 8000),
    },
  });

  revalidateCourse(courseId);
}

export async function archiveCourseAction(
  courseId: string,
  archived: boolean,
) {
  const user = await requireUser();
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found.");

  await prisma.course.update({
    where: { id: courseId },
    data: { status: archived ? "ARCHIVED" : "ACTIVE" },
  });

  if (!archived) {
    await normalizeCourseProgress(courseId);
  }

  revalidateCourse(courseId);
}

export async function deleteCourseAction(courseId: string) {
  const user = await requireUser();

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    select: {
      id: true,
      sources: {
        where: { storagePath: { not: null } },
        select: { storagePath: true },
      },
    },
  });

  if (!course) {
    throw new Error("Course not found.");
  }

  await Promise.all(
    course.sources
      .map((source) => source.storagePath)
      .filter((path): path is string => Boolean(path))
      .map((path) => deleteSourceFile(path)),
  );

  const deleted = await prisma.course.deleteMany({
    where: { id: courseId, ownerId: user.id },
  });

  if (deleted.count !== 1) {
    throw new Error("Course not found.");
  }

  revalidatePath("/");
  revalidatePath("/templates");
  redirect("/");
}

export async function duplicateCourseAction(courseId: string) {
  const user = await requireUser();
  const structure = await courseToStructure(user.id, courseId);
  const duplicate = await createCourseFromStructure(user.id, structure, {
    titleSuffix: " (copy)",
    prompt: "Duplicated from course " + courseId,
  });

  revalidatePath("/");
  redirect("/courses/" + duplicate.id + "/manage");
}

export async function saveCourseAsTemplateAction(
  courseId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const rawName = formData.get("name");
  const name =
    typeof rawName === "string" && rawName.trim()
      ? requiredText(rawName, "Template name", 200)
      : undefined;

  await storeTemplateFromCourse(user.id, courseId, name);
  revalidatePath("/templates");
  revalidateCourse(courseId);
}

export async function createModuleAction(
  courseId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const course = await getOwnedCourse(user.id, courseId);
  if (!course) throw new Error("Course not found.");

  await prisma.module.create({
    data: {
      courseId,
      title: requiredText(formData.get("title"), "Module title", 200),
      description: parseNullableText(formData.get("description"), 2000),
      objective: parseNullableText(formData.get("objective"), 2000),
      order: course.modules.length + 1,
    },
  });

  revalidateCourse(courseId);
}

export async function updateModuleAction(
  courseId: string,
  moduleId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    select: { id: true },
  });
  if (!courseModule) throw new Error("Module not found.");

  await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: requiredText(formData.get("title"), "Module title", 200),
      description: parseNullableText(formData.get("description"), 2000),
      objective: parseNullableText(formData.get("objective"), 2000),
    },
  });

  revalidateCourse(courseId);
}

export async function moveModuleAction(
  courseId: string,
  moduleId: string,
  direction: -1 | 1,
) {
  const user = await requireUser();
  const course = await getOwnedCourse(user.id, courseId);
  if (!course) throw new Error("Course not found.");

  const ids = course.modules.map((module) => module.id);
  const index = ids.indexOf(moduleId);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;

  [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
  await reorderModules(user.id, courseId, ids);
  revalidateCourse(courseId);
}

export async function deleteModuleAction(
  courseId: string,
  moduleId: string,
) {
  const user = await requireUser();
  const course = await getOwnedCourse(user.id, courseId);
  if (!course) throw new Error("Course not found.");

  const courseModule = course.modules.find((item) => item.id === moduleId);
  if (!courseModule) throw new Error("Module not found.");

  await prisma.module.delete({ where: { id: moduleId } });

  const remaining = course.modules
    .filter((item) => item.id !== moduleId)
    .map((item) => item.id);

  if (remaining.length > 0) {
    await reorderModules(user.id, courseId, remaining);
  } else {
    await normalizeCourseProgress(courseId);
  }

  revalidateCourse(courseId);
}

export async function createLessonAction(
  courseId: string,
  moduleId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });

  if (!courseModule) throw new Error("Module not found.");

  const difficultyRaw = formData.get("difficulty");
  const difficulty =
    typeof difficultyRaw === "string" &&
    ["INTRODUCTORY", "EASY", "MEDIUM", "HARD", "ADVANCED"].includes(difficultyRaw)
      ? difficultyRaw as "INTRODUCTORY" | "EASY" | "MEDIUM" | "HARD" | "ADVANCED"
      : "MEDIUM";

  const created = await prisma.lesson.create({
    data: {
      moduleId,
      title: requiredText(formData.get("title"), "Lesson title", 200),
      description: parseNullableText(formData.get("description"), 2000),
      objectives: parseLineList(formData.get("objectives")),
      concepts: parseLineList(formData.get("concepts")),
      difficulty,
      isOptional: formData.get("isOptional") === "on",
      order: courseModule.lessons.length + 1,
      status: "LOCKED",
    },
  });

  const previous = courseModule.lessons.at(-1);
  if (previous) {
    await prisma.lessonPrerequisite.create({
      data: {
        lessonId: created.id,
        prerequisiteLessonId: previous.id,
      },
    });
  }

  await normalizeCourseProgress(courseId);
  revalidateCourse(courseId);
}

export async function updateLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      moduleId,
      module: {
        courseId,
        course: { ownerId: user.id },
      },
    },
    select: { id: true },
  });
  if (!lesson) throw new Error("Lesson not found.");

  const difficultyRaw = formData.get("difficulty");
  const difficulty =
    typeof difficultyRaw === "string" &&
    ["INTRODUCTORY", "EASY", "MEDIUM", "HARD", "ADVANCED"].includes(difficultyRaw)
      ? difficultyRaw as "INTRODUCTORY" | "EASY" | "MEDIUM" | "HARD" | "ADVANCED"
      : "MEDIUM";

  const prerequisiteIds = formData
    .getAll("prerequisiteIds")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => value !== lessonId);

  await prisma.$transaction(async (tx) => {
    const valid = await tx.lesson.findMany({
      where: {
        id: { in: prerequisiteIds },
        module: { courseId },
      },
      select: { id: true },
    });

    if (valid.length !== new Set(prerequisiteIds).size) {
      throw new Error("One or more prerequisites are invalid.");
    }

    await tx.lesson.update({
      where: { id: lessonId },
      data: {
        title: requiredText(formData.get("title"), "Lesson title", 200),
        description: parseNullableText(formData.get("description"), 2000),
        objectives: parseLineList(formData.get("objectives")),
        concepts: parseLineList(formData.get("concepts")),
        difficulty,
        isOptional: formData.get("isOptional") === "on",
      },
    });

    await tx.lessonPrerequisite.deleteMany({ where: { lessonId } });

    if (prerequisiteIds.length > 0) {
      await tx.lessonPrerequisite.createMany({
        data: prerequisiteIds.map((prerequisiteLessonId) => ({
          lessonId,
          prerequisiteLessonId,
        })),
      });
    }

    const graphLessons = await tx.lesson.findMany({
      where: { module: { courseId } },
      select: {
        id: true,
        prerequisites: {
          select: { prerequisiteLessonId: true },
        },
      },
    });

    const cyclic = hasPrerequisiteCycle(
      graphLessons.map((item) => ({
        id: item.id,
        prerequisiteIds: item.prerequisites.map(
          (edge) => edge.prerequisiteLessonId,
        ),
      })),
    );

    if (cyclic) {
      throw new Error("Prerequisites cannot contain a cycle.");
    }
  });

  await normalizeCourseProgress(courseId);
  revalidateCourse(courseId);
  revalidatePath("/courses/" + courseId + "/lessons/" + lessonId);
}

export async function moveLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
  direction: -1 | 1,
) {
  const user = await requireUser();
  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!courseModule) throw new Error("Module not found.");

  const ids = courseModule.lessons.map((lesson) => lesson.id);
  const index = ids.indexOf(lessonId);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;

  [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
  await reorderLessons(user.id, moduleId, ids);
  revalidateCourse(courseId);
}

export async function deleteLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
) {
  const user = await requireUser();
  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!courseModule) throw new Error("Module not found.");

  const lesson = courseModule.lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error("Lesson not found.");

  await prisma.lesson.delete({ where: { id: lessonId } });

  const remaining = courseModule.lessons
    .filter((item) => item.id !== lessonId)
    .map((item) => item.id);

  if (remaining.length > 0) {
    await reorderLessons(user.id, moduleId, remaining);
  } else {
    await normalizeCourseProgress(courseId);
  }

  revalidateCourse(courseId);
}

export async function importCourseAction(formData: FormData) {
  const user = await requireUser();
  const raw = requiredText(formData.get("structure"), "Course JSON", 200000);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Course JSON is invalid.");
  }

  const structure = courseStructureSchema.parse(parsed);
  const course = await createCourseFromStructure(user.id, structure);

  revalidatePath("/");
  redirect("/courses/" + course.id + "/manage");
}

export async function createCourseFromTemplateAction(templateId: string) {
  const user = await requireUser();
  const template = await prisma.courseTemplate.findFirst({
    where: { id: templateId, ownerId: user.id },
  });
  if (!template) throw new Error("Template not found.");

  const structure = courseStructureSchema.parse(template.structure);
  const course = await createCourseFromStructure(user.id, structure, {
    prompt: "Created from template " + template.id,
  });

  revalidatePath("/");
  redirect("/courses/" + course.id + "/manage");
}

export async function deleteTemplateAction(templateId: string) {
  const user = await requireUser();
  const deleted = await prisma.courseTemplate.deleteMany({
    where: { id: templateId, ownerId: user.id },
  });
  if (deleted.count !== 1) throw new Error("Template not found.");

  revalidatePath("/templates");
}
