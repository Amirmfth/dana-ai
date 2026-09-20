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
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    select: { id: true },
  });
  if (!module) throw new Error("Module not found.");

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

  const module = course.modules.find((item) => item.id === moduleId);
  if (!module) throw new Error("Module not found.");

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
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });

  if (!module) throw new Error("Module not found.");

  await prisma.lesson.create({
    data: {
      moduleId,
      title: requiredText(formData.get("title"), "Lesson title", 200),
      description: parseNullableText(formData.get("description"), 2000),
      objectives: parseLineList(formData.get("objectives")),
      concepts: parseLineList(formData.get("concepts")),
      order: module.lessons.length + 1,
      status: "LOCKED",
    },
  });

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

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: requiredText(formData.get("title"), "Lesson title", 200),
      description: parseNullableText(formData.get("description"), 2000),
      objectives: parseLineList(formData.get("objectives")),
      concepts: parseLineList(formData.get("concepts")),
    },
  });

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
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!module) throw new Error("Module not found.");

  const ids = module.lessons.map((lesson) => lesson.id);
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
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!module) throw new Error("Module not found.");

  const lesson = module.lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error("Lesson not found.");

  await prisma.lesson.delete({ where: { id: lessonId } });

  const remaining = module.lessons
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
