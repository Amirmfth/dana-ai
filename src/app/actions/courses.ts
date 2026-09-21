"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import {
  courseOnboardingSchema,
} from "@/lib/ai/schemas/course";
import { createCourse } from "@/lib/courses/create-course";
import {
  ingestFileSource,
  ingestTextSource,
  ingestUrlSource,
} from "@/lib/sources/ingestion";

export async function createCourseAction(formData: FormData) {
  const user = await requireUser();

  const parsed = courseOnboardingSchema.parse({
    prompt: formData.get("prompt"),
    currentLevel: formData.get("currentLevel"),
    targetLevel: formData.get("targetLevel"),
    weeklyStudyMinutes: Number(formData.get("weeklyStudyMinutes")),
    learningStyle: formData.get("learningStyle"),
  });

  const draftCourse = await prisma.course.create({
    data: {
      ownerId: user.id,
      title: "Creating course…",
      goal: parsed.prompt,
      prompt: parsed.prompt,
      currentLevel: parsed.currentLevel,
      targetLevel: parsed.targetLevel,
      weeklyStudyMinutes: parsed.weeklyStudyMinutes,
      learningStyle: parsed.learningStyle,
      status: "DRAFT",
    },
    select: { id: true },
  });

  const sourceIds: string[] = [];

  try {
    const file = formData.get("sourceFile");
    if (file instanceof File && file.size > 0) {
      const source = await ingestFileSource({
        ownerId: user.id,
        courseId: draftCourse.id,
        file,
      });
      sourceIds.push(source.id);
    }

    const sourceUrl = formData.get("sourceUrl");
    if (typeof sourceUrl === "string" && sourceUrl.trim()) {
      const source = await ingestUrlSource({
        ownerId: user.id,
        courseId: draftCourse.id,
        url: sourceUrl.trim(),
      });
      sourceIds.push(source.id);
    }

    const sourceText = formData.get("sourceText");
    if (typeof sourceText === "string" && sourceText.trim()) {
      const sourceTitle = formData.get("sourceTitle");
      const source = await ingestTextSource({
        ownerId: user.id,
        courseId: draftCourse.id,
        title:
          typeof sourceTitle === "string" && sourceTitle.trim()
            ? sourceTitle.trim()
            : "Pasted course notes",
        text: sourceText,
      });
      sourceIds.push(source.id);
    }

    const course = await createCourse(user.id, parsed, {
      sourceIds,
      draftCourseId: draftCourse.id,
    });
  } catch (error) {
    await prisma.course
      .update({
        where: { id: draftCourse.id },
        data: {
          status: "DRAFT",
          description:
            "Course setup did not finish. Open Sources to inspect or retry attached material.",
        },
      })
      .catch(() => null);
    throw error;
  }

  redirect("/courses/" + draftCourse.id);
}
