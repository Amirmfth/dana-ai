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
    contentLanguage: formData.get("contentLanguage") || "English",
    courseMode: formData.get("courseMode") || "GUIDED",
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
      contentLanguage: parsed.contentLanguage,
      mode: parsed.courseMode,
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


export async function createCourseDraftAction(formData: FormData) {
  const user = await requireUser();

  const parsed = courseOnboardingSchema.parse({
    prompt: formData.get("prompt"),
    currentLevel: formData.get("currentLevel"),
    targetLevel: formData.get("targetLevel"),
    weeklyStudyMinutes: Number(formData.get("weeklyStudyMinutes")),
    learningStyle: formData.get("learningStyle"),
    contentLanguage: formData.get("contentLanguage") || "English",
    courseMode: formData.get("courseMode") || "GUIDED",
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
      contentLanguage: parsed.contentLanguage,
      mode: parsed.courseMode,
      status: "DRAFT",
      generationJob: {
        create: {
          status: "GENERATING",
          stage: "PROCESSING_SOURCES",
          startedAt: new Date(),
        },
      },
    },
    select: { id: true },
  });

  try {
    const file = formData.get("sourceFile");
    if (file instanceof File && file.size > 0) {
      await ingestFileSource({
        ownerId: user.id,
        courseId: draftCourse.id,
        file,
      });
    }

    const sourceUrl = formData.get("sourceUrl");
    if (typeof sourceUrl === "string" && sourceUrl.trim()) {
      await ingestUrlSource({
        ownerId: user.id,
        courseId: draftCourse.id,
        url: sourceUrl.trim(),
      });
    }

    const sourceText = formData.get("sourceText");
    if (typeof sourceText === "string" && sourceText.trim()) {
      const sourceTitle = formData.get("sourceTitle");
      await ingestTextSource({
        ownerId: user.id,
        courseId: draftCourse.id,
        title:
          typeof sourceTitle === "string" && sourceTitle.trim()
            ? sourceTitle.trim()
            : "Pasted course notes",
        text: sourceText,
      });
    }

    await prisma.courseGenerationJob.update({
      where: { courseId: draftCourse.id },
      data: {
        status: "NOT_STARTED",
        stage: "PLANNING_CURRICULUM",
      },
    });

    return { courseId: draftCourse.id };
  } catch (error) {
    await prisma.courseGenerationJob.update({
      where: { courseId: draftCourse.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Source preparation failed.",
      },
    }).catch(() => null);
    throw error;
  }
}

export async function finishCourseGenerationAction(courseId: string) {
  const user = await requireUser();
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id, status: "DRAFT" },
    include: {
      sources: {
        where: { status: "READY" },
        select: { id: true },
      },
    },
  });

  if (!course) {
    const ready = await prisma.course.findFirst({
      where: { id: courseId, ownerId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
      select: { id: true },
    });
    if (ready) {
      await prisma.courseGenerationJob.upsert({
        where: { courseId },
        create: {
          courseId,
          status: "READY",
          stage: "READY",
          completedAt: new Date(),
        },
        update: {
          status: "READY",
          stage: "READY",
          completedAt: new Date(),
          errorMessage: null,
        },
      });
      return { courseId: ready.id };
    }
    throw new Error("Course draft not found.");
  }

  const parsed = courseOnboardingSchema.parse({
    prompt: course.prompt,
    currentLevel: course.currentLevel,
    targetLevel: course.targetLevel,
    weeklyStudyMinutes: course.weeklyStudyMinutes,
    learningStyle: course.learningStyle,
    contentLanguage: course.contentLanguage,
    courseMode: course.mode,
  });

  await prisma.courseGenerationJob.upsert({
    where: { courseId },
    create: {
      courseId,
      status: "NOT_STARTED",
      stage: "PLANNING_CURRICULUM",
    },
    update: {},
  });

  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const claimed = await prisma.courseGenerationJob.updateMany({
    where: {
      courseId,
      OR: [
        { status: { in: ["NOT_STARTED", "FAILED"] } },
        { status: "GENERATING", startedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: "GENERATING",
      stage: "PLANNING_CURRICULUM",
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
    },
  });

  if (claimed.count === 0) {
    const current = await prisma.courseGenerationJob.findUnique({
      where: { courseId },
      select: { status: true },
    });
    if (current?.status === "READY") return { courseId };
    return { courseId, alreadyGenerating: true };
  }

  try {
    await createCourse(user.id, parsed, {
      sourceIds: course.sources.map((source) => source.id),
      draftCourseId: courseId,
    });

    await prisma.courseGenerationJob.update({
      where: { courseId },
      data: {
        status: "READY",
        stage: "READY",
        completedAt: new Date(),
        errorMessage: null,
      },
    });

    return { courseId };
  } catch (error) {
    await prisma.courseGenerationJob.update({
      where: { courseId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Course generation failed.",
      },
    }).catch(() => null);
    throw error;
  }
}
