"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { completeLesson } from "@/lib/lessons/progress";

export async function completeLessonAction(
  formData: FormData,
) {
  const lessonId = formData.get("lessonId");
  const courseId = formData.get("courseId");

  if (
    typeof lessonId !== "string" ||
    typeof courseId !== "string"
  ) {
    throw new Error(
      "Lesson ID and course ID are required.",
    );
  }

  const result = await completeLesson(lessonId);

  if (result.courseId !== courseId) {
    throw new Error(
      "Lesson does not belong to this course.",
    );
  }

  revalidatePath(`/courses/${courseId}`);

  revalidatePath(
    `/courses/${courseId}/lessons/${lessonId}`,
  );

  if (result.nextLessonId) {
    redirect(
      `/courses/${courseId}/lessons/${result.nextLessonId}`,
    );
  }

  redirect(`/courses/${courseId}`);
}