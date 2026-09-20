"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import {
  courseOnboardingSchema,
} from "@/lib/ai/schemas/course";
import { createCourse } from "@/lib/courses/create-course";

export async function createCourseAction(formData: FormData) {
  const user = await requireUser();

  const parsed = courseOnboardingSchema.parse({
    prompt: formData.get("prompt"),
    currentLevel: formData.get("currentLevel"),
    targetLevel: formData.get("targetLevel"),
    weeklyStudyMinutes: Number(formData.get("weeklyStudyMinutes")),
    learningStyle: formData.get("learningStyle"),
  });

  const course = await createCourse(user.id, parsed);
  redirect("/courses/" + course.id);
}
