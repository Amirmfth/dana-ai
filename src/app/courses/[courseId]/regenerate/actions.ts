"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/server";
import {
  activateLessonContentVersion,
  regenerateLessonContent,
} from "@/lib/regeneration/lesson";
import {
  activateQuizVersion,
  regenerateQuiz,
} from "@/lib/regeneration/quiz";
import {
  applyCurriculumRevision,
  createCourseRevision,
  createModuleRevision,
} from "@/lib/regeneration/curriculum";

function revalidateCourse(courseId: string, lessonId?: string) {
  revalidatePath("/courses/" + courseId);
  revalidatePath("/courses/" + courseId + "/manage");
  revalidatePath("/courses/" + courseId + "/regenerate");

  if (lessonId) {
    revalidatePath("/courses/" + courseId + "/lessons/" + lessonId);
    revalidatePath(
      "/courses/" + courseId + "/lessons/" + lessonId + "/versions",
    );
  }
}

export async function regenerateLessonAction(
  courseId: string,
  lessonId: string,
) {
  const user = await requireUser();
  await regenerateLessonContent(user.id, lessonId);
  revalidateCourse(courseId, lessonId);
}

export async function regenerateQuizAction(
  courseId: string,
  lessonId: string,
) {
  const user = await requireUser();
  await regenerateQuiz(user.id, lessonId);
  revalidateCourse(courseId, lessonId);
}

export async function activateLessonVersionAction(
  courseId: string,
  lessonId: string,
  versionId: string,
) {
  const user = await requireUser();
  await activateLessonContentVersion(user.id, lessonId, versionId);
  revalidateCourse(courseId, lessonId);
}

export async function activateQuizVersionAction(
  courseId: string,
  lessonId: string,
  versionId: string,
) {
  const user = await requireUser();
  await activateQuizVersion(user.id, lessonId, versionId);
  revalidateCourse(courseId, lessonId);
}

export async function regenerateCourseAction(courseId: string) {
  const user = await requireUser();
  await createCourseRevision(user.id, courseId);
  revalidateCourse(courseId);
}

export async function regenerateModuleAction(
  courseId: string,
  moduleId: string,
) {
  const user = await requireUser();
  await createModuleRevision(user.id, courseId, moduleId);
  revalidateCourse(courseId);
}

export async function applyRevisionAction(
  courseId: string,
  revisionId: string,
) {
  const user = await requireUser();
  await applyCurriculumRevision(user.id, revisionId);
  revalidateCourse(courseId);
}
