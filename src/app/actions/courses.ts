"use server";

import { redirect } from "next/navigation";

import { createCourse } from "@/lib/courses/create-course";

export async function createCourseAction(formData: FormData) {
  const prompt = formData.get("prompt");

  if (typeof prompt !== "string") {
    throw new Error("Course prompt is required.");
  }

  const course = await createCourse(prompt);

  redirect(`/courses/${course.id}`);
}
