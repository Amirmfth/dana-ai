"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export async function retakeAssessmentAction(
  courseId: string,
  assessmentVersionId: string,
  returnPath: string,
) {
  const user = await requireUser();

  const version = await prisma.assessmentVersion.findFirst({
    where: {
      id: assessmentVersionId,
      assessment: { courseId, course: { ownerId: user.id } },
    },
  });

  if (!version) throw new Error("Assessment not found.");

  await prisma.assessmentRun.create({
    data: {
      userId: user.id,
      assessmentVersionId,
    },
  });

  revalidatePath(returnPath);
  redirect(returnPath);
}
