"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import {
  deleteCourseSource,
  ingestFileSource,
  ingestTextSource,
  ingestUrlSource,
} from "@/lib/sources/ingestion";

async function requireOwnedCourse(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: userId },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found.");
}

function revalidateSources(courseId: string) {
  revalidatePath("/courses/" + courseId);
  revalidatePath("/courses/" + courseId + "/sources");
  revalidatePath("/courses/" + courseId + "/manage");
}

export async function addFileSourceAction(courseId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedCourse(user.id, courseId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a source file.");
  await ingestFileSource({ ownerId: user.id, courseId, file });
  revalidateSources(courseId);
}

export async function addUrlSourceAction(courseId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedCourse(user.id, courseId);
  const url = formData.get("url");
  if (typeof url !== "string" || !url.trim()) throw new Error("URL is required.");
  await ingestUrlSource({ ownerId: user.id, courseId, url: url.trim() });
  revalidateSources(courseId);
}

export async function addTextSourceAction(courseId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedCourse(user.id, courseId);
  const title = formData.get("title");
  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) throw new Error("Source text is required.");
  await ingestTextSource({
    ownerId: user.id,
    courseId,
    title: typeof title === "string" && title.trim() ? title.trim() : "Course notes",
    text: content,
  });
  revalidateSources(courseId);
}

export async function deleteSourceAction(courseId: string, sourceId: string) {
  const user = await requireUser();
  await requireOwnedCourse(user.id, courseId);
  const source = await prisma.courseSource.findFirst({
    where: { id: sourceId, courseId, ownerId: user.id },
    select: { id: true },
  });
  if (!source) throw new Error("Source not found.");
  await deleteCourseSource(user.id, sourceId);
  revalidateSources(courseId);
}
