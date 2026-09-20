"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import {
  ensureCourseFinalAssessment,
  ensureModuleAssessment,
} from "@/lib/assessments/service";

export async function regenerateModuleAssessmentAction(
  courseId: string,
  moduleId: string,
  returnPath: string,
) {
  const user = await requireUser();
  await ensureModuleAssessment(user.id, courseId, moduleId, true);

  revalidatePath(returnPath);
  revalidatePath("/courses/" + courseId + "/assessments");
  redirect(returnPath);
}

export async function regenerateCourseFinalAssessmentAction(
  courseId: string,
  returnPath: string,
) {
  const user = await requireUser();
  await ensureCourseFinalAssessment(user.id, courseId, true);

  revalidatePath(returnPath);
  revalidatePath("/courses/" + courseId + "/assessments");
  redirect(returnPath);
}
