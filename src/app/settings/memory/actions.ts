"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { embedMemory } from "@/lib/memory/vector-memory";

const memoryTypes = new Set([
  "MISCONCEPTION",
  "WEAKNESS",
  "STRENGTH",
  "PREFERENCE",
  "LEARNING_NOTE",
]);

async function requireOwnedMemory(userId: string, memoryId: string) {
  const memory = await prisma.courseMemory.findFirst({
    where: {
      id: memoryId,
      course: { ownerId: userId },
    },
    select: {
      id: true,
      courseId: true,
      lessonId: true,
    },
  });

  if (!memory) throw new Error("Memory not found.");
  return memory;
}

export async function updateMemoryAction(
  memoryId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const memory = await requireOwnedMemory(user.id, memoryId);

  const content = String(formData.get("content") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const importance = Number(formData.get("importance"));
  const isActive = formData.get("isActive") === "on";

  if (!content || content.length > 1000) {
    throw new Error("Memory content must be between 1 and 1000 characters.");
  }
  if (!memoryTypes.has(type)) throw new Error("Invalid memory type.");
  if (!Number.isInteger(importance) || importance < 1 || importance > 5) {
    throw new Error("Importance must be between 1 and 5.");
  }

  await prisma.courseMemory.update({
    where: { id: memory.id },
    data: {
      content,
      type: type as
        | "MISCONCEPTION"
        | "WEAKNESS"
        | "STRENGTH"
        | "PREFERENCE"
        | "LEARNING_NOTE",
      importance,
      isActive,
    },
  });

  try {
    await embedMemory({
      memoryId: memory.id,
      content,
      courseId: memory.courseId,
      lessonId: memory.lessonId ?? undefined,
    });
  } catch (error) {
    console.error("Failed to refresh edited memory embedding:", error);
  }

  revalidatePath("/settings/memory");
}

export async function toggleMemoryAction(
  memoryId: string,
  isActive: boolean,
  _formData?: FormData,
) {
  const user = await requireUser();
  const memory = await requireOwnedMemory(user.id, memoryId);

  await prisma.courseMemory.update({
    where: { id: memory.id },
    data: { isActive },
  });

  revalidatePath("/settings/memory");
}

export async function deleteMemoryAction(
  memoryId: string,
  _formData?: FormData,
) {
  const user = await requireUser();
  const memory = await requireOwnedMemory(user.id, memoryId);

  await prisma.courseMemory.delete({ where: { id: memory.id } });
  revalidatePath("/settings/memory");
}

export async function clearMemoriesAction() {
  const user = await requireUser();

  await prisma.courseMemory.deleteMany({
    where: { course: { ownerId: user.id } },
  });

  revalidatePath("/settings/memory");
}
