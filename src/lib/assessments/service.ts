import { Prisma } from "@/generated/prisma/client";

import {
  generatePlacementAssessment,
  generateTestOutAssessment,
} from "@/lib/ai/assessment-generator";
import { prisma } from "@/lib/db/prisma";
import { normalizeCourseProgress } from "@/lib/courses/management";

function questionData(options: string[]) {
  return { options } as Prisma.InputJsonValue;
}

function answerKey(value: string) {
  return { value } as Prisma.InputJsonValue;
}

async function persistVersion(
  assessmentId: string,
  generated: Awaited<ReturnType<typeof generatePlacementAssessment>>,
  validLessonIds: Set<string>,
) {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.assessmentVersion.findFirst({
      where: { assessmentId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const version = await tx.assessmentVersion.create({
      data: {
        assessmentId,
        version: (latest?.version ?? 0) + 1,
      },
    });

    const questions = generated.questions.filter((question) =>
      validLessonIds.has(question.targetLessonId),
    );

    if (questions.length < 3) {
      throw new Error("Assessment generation did not produce enough valid questions.");
    }

    await tx.assessmentQuestion.createMany({
      data: questions.map((question, index) => ({
        assessmentVersionId: version.id,
        targetLessonId: question.targetLessonId,
        type: "MULTIPLE_CHOICE",
        order: index + 1,
        question: question.question,
        data: questionData(question.options),
        answerKey: answerKey(question.correctAnswer),
        explanation: question.explanation,
        concepts: question.concepts,
      })),
    });

    return version;
  });
}

export async function ensurePlacementAssessment(
  userId: string,
  courseId: string,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: userId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found.");

  let assessment = await prisma.assessment.findFirst({
    where: { courseId, type: "PLACEMENT", lessonId: null, moduleId: null },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        courseId,
        type: "PLACEMENT",
        title: course.title + " placement test",
        passingScore: 70,
      },
      include: { versions: true },
    });
  }

  if (assessment.versions[0]) return assessment.versions[0];

  const lessons = course.modules
    .flatMap((courseModule) => courseModule.lessons)
    .slice(0, 20);

  if (lessons.length < 3) {
    throw new Error("Placement tests require at least three lessons.");
  }

  const generated = await generatePlacementAssessment(
    userId,
    {
      id: course.id,
      title: course.title,
      goal: course.goal,
      currentLevel: course.currentLevel,
      targetLevel: course.targetLevel,
    },
    lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      objectives: lesson.objectives,
      concepts: lesson.concepts,
      difficulty: lesson.difficulty,
    })),
  );

  return persistVersion(
    assessment.id,
    generated,
    new Set(lessons.map((lesson) => lesson.id)),
  );
}

export async function ensureTestOutAssessment(
  userId: string,
  courseId: string,
  lessonId: string,
) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { courseId, course: { ownerId: userId } },
    },
    include: {
      module: {
        include: { course: true },
      },
    },
  });
  if (!lesson) throw new Error("Lesson not found.");

  let assessment = await prisma.assessment.findFirst({
    where: { courseId, lessonId, type: "TEST_OUT" },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        courseId,
        lessonId,
        type: "TEST_OUT",
        title: "Test out: " + lesson.title,
        passingScore: 80,
      },
      include: { versions: true },
    });
  }

  if (assessment.versions[0]) return assessment.versions[0];

  const generated = await generateTestOutAssessment(
    userId,
    courseId,
    {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      objectives: lesson.objectives,
      concepts: lesson.concepts,
      difficulty: lesson.difficulty,
    },
  );

  return persistVersion(
    assessment.id,
    generated,
    new Set([lesson.id]),
  );
}

export async function getOrCreateAssessmentRun(
  userId: string,
  assessmentVersionId: string,
) {
  const existing = await prisma.assessmentRun.findFirst({
    where: {
      userId,
      assessmentVersionId,
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (existing) return existing;

  return prisma.assessmentRun.create({
    data: { userId, assessmentVersionId },
  });
}

export async function applyAssessmentOutcome(
  userId: string,
  runId: string,
) {
  const run = await prisma.assessmentRun.findFirst({
    where: { id: runId, userId },
    include: {
      assessmentVersion: {
        include: {
          assessment: true,
          questions: true,
        },
      },
      answers: true,
    },
  });
  if (!run || run.completedAt) return run;

  const assessment = run.assessmentVersion.assessment;
  const questions = run.assessmentVersion.questions;
  if (run.answers.length < questions.length) return run;

  const correct = run.answers.filter(
    (answer) => answer.result === "CORRECT",
  ).length;
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= assessment.passingScore;

  await prisma.$transaction(async (tx) => {
    await tx.assessmentRun.update({
      where: { id: run.id },
      data: {
        score,
        total: questions.length,
        passed,
        completedAt: new Date(),
      },
    });

    if (assessment.type === "TEST_OUT" && passed && assessment.lessonId) {
      await tx.lesson.update({
        where: { id: assessment.lessonId },
        data: {
          status: "COMPLETED",
          completionMethod: "TESTED_OUT",
          completedAt: new Date(),
        },
      });
    }

    if (assessment.type === "PLACEMENT") {
      const answerByQuestion = new Map(
        run.answers.map((answer) => [answer.questionId, answer.result]),
      );

      const lessonEvidence = new Map<
        string,
        { correct: number; total: number }
      >();

      for (const question of questions) {
        if (!question.targetLessonId) continue;
        const current = lessonEvidence.get(question.targetLessonId) ?? {
          correct: 0,
          total: 0,
        };
        current.total += 1;
        if (answerByQuestion.get(question.id) === "CORRECT") {
          current.correct += 1;
        }
        lessonEvidence.set(question.targetLessonId, current);
      }

      const passedLessonIds = [...lessonEvidence.entries()]
        .filter(([, evidence]) =>
          evidence.total > 0 &&
          evidence.correct / evidence.total >= 0.8
        )
        .map(([lessonId]) => lessonId);

      if (passedLessonIds.length > 0) {
        await tx.lesson.updateMany({
          where: {
            id: { in: passedLessonIds },
            module: { courseId: assessment.courseId },
          },
          data: {
            status: "COMPLETED",
            completionMethod: "TESTED_OUT",
            completedAt: new Date(),
          },
        });
      }
    }
  });

  await normalizeCourseProgress(assessment.courseId);

  return prisma.assessmentRun.findUnique({
    where: { id: run.id },
  });
}
