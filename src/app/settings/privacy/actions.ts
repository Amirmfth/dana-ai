"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export async function updatePrivacySettingsAction(formData: FormData) {
  const user = await requireUser();
  const storeAiPayloads = formData.get("storeAiPayloads") === "on";
  const useLearnerMemory = formData.get("useLearnerMemory") === "on";
  const requestedRetention = Number(formData.get("retentionDays"));
  const retentionDays = [7, 30, 90].includes(requestedRetention)
    ? requestedRetention
    : 30;

  await prisma.userPrivacySettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      storeAiPayloads,
      retentionDays,
      useLearnerMemory,
    },
    update: {
      storeAiPayloads,
      retentionDays,
      useLearnerMemory,
    },
  });

  if (!storeAiPayloads) {
    await prisma.aiUsage.updateMany({
      where: { userId: user.id },
      data: { input: Prisma.DbNull, output: null },
    });
  }

  revalidatePath("/settings/privacy");
}
