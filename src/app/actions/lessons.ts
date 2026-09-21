"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import {
  completeLesson,
  skipOptionalLesson,
} from "@/lib/lessons/progress";

export async function completeLessonAction(formData: FormData) {
  const user = await requireUser();
  const lessonId = formData.get("lessonId");
  const courseId = formData.get("courseId");

  if (typeof lessonId !== "string" || typeof courseId !== "string") {
    throw new Error("Lesson ID and course ID are required.");
  }

  const result = await completeLesson(user.id, lessonId);

  if (result.courseId !== courseId) {
    throw new Error("Lesson does not belong to this course.");
  }

  revalidatePath("/courses/" + courseId);
  revalidatePath("/courses/" + courseId + "/lessons/" + lessonId);

  if (result.nextLessonId) {
    redirect(
      "/courses/" +
        courseId +
        "/lessons/" +
        result.nextLessonId +
        "?completedPrevious=1",
    );
  }

  redirect("/courses/" + courseId + "?completedLesson=1");
}


export async function skipLessonAction(formData: FormData) {
  const user = await requireUser();
  const lessonId = formData.get("lessonId");
  const courseId = formData.get("courseId");

  if (typeof lessonId !== "string" || typeof courseId !== "string") {
    throw new Error("Lesson ID and course ID are required.");
  }

  const result = await skipOptionalLesson(user.id, lessonId);

  if (result.courseId !== courseId) {
    throw new Error("Lesson does not belong to this course.");
  }

  revalidatePath("/courses/" + courseId);
  revalidatePath("/courses/" + courseId + "/lessons/" + lessonId);
  redirect("/courses/" + courseId);
}
