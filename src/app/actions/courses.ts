"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import { createCourse } from "@/lib/courses/create-course";

export async function createCourseAction(formData: FormData) {
  const user = await requireUser();
  const prompt = formData.get("prompt");

  if (typeof prompt !== "string") {
    throw new Error("Course prompt is required.");
  }

  const course = await createCourse(user.id, prompt);

  redirect("/courses/" + course.id);
}
