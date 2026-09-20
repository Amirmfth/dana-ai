import { conceptBand, progressPercent } from "@/lib/analytics/core";
import {
  estimateLessonMinutes,
  estimateRemainingMinutes,
} from "@/lib/analytics/estimates";
import { prisma } from "@/lib/db/prisma";

export async function getCourseAnalytics(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: userId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              content: { select: { content: true } },
              exercises: { select: { id: true, quizVersionId: true } },
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  );

  const completedLessons = lessons.filter(
    (lesson) => lesson.status === "COMPLETED",
  ).length;

  const lessonEstimates = lessons.map((lesson) => ({
    lessonId: lesson.id,
    title: lesson.title,
    moduleTitle: lesson.moduleTitle,
    status: lesson.status,
    minutes: estimateLessonMinutes({
      content: lesson.content?.content ?? null,
      objectivesCount: lesson.objectives.length,
      conceptsCount: lesson.concepts.length,
      exerciseCount: lesson.exercises.filter(
        (exercise) => exercise.quizVersionId === lesson.activeQuizVersionId,
      ).length,
    }),
  }));

  const [quizRuns, attempts, studyAggregate, latestEvent, latestStudy, events] =
    await Promise.all([
      prisma.quizRun.findMany({
        where: {
          userId,
          lesson: { module: { courseId } },
          completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
        take: 30,
        include: {
          lesson: {
            select: {
              title: true,
              module: { select: { title: true } },
            },
          },
        },
      }),
      prisma.exerciseAttempt.findMany({
        where: {
          quizRun: {
            userId,
            lesson: { module: { courseId } },
          },
        },
        select: {
          result: true,
          exercise: {
            select: {
              concepts: true,
            },
          },
        },
      }),
      prisma.studyTime.aggregate({
        where: { userId, courseId },
        _sum: { seconds: true },
      }),
      prisma.learningEvent.findFirst({
        where: { userId, courseId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.studyTime.findFirst({
        where: { userId, courseId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.learningEvent.findMany({
        where: { userId, courseId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          lesson: {
            select: {
              title: true,
              module: { select: { title: true } },
            },
          },
        },
      }),
    ]);

  const conceptMap = new Map<
    string,
    { correct: number; attempts: number }
  >();

  for (const attempt of attempts) {
    for (const concept of attempt.exercise.concepts) {
      const current = conceptMap.get(concept) ?? { correct: 0, attempts: 0 };
      current.attempts += 1;
      if (attempt.result === "CORRECT") current.correct += 1;
      conceptMap.set(concept, current);
    }
  }

  const concepts = [...conceptMap.entries()]
    .map(([concept, value]) => ({
      concept,
      correct: value.correct,
      attempts: value.attempts,
      accuracy: Math.round((value.correct / value.attempts) * 100),
      band: conceptBand(value.correct, value.attempts),
    }))
    .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy);

  const completedRuns = quizRuns.filter(
    (run) => run.total && run.total > 0 && run.score !== null,
  );

  const quizAverage =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce(
            (sum, run) => sum + ((run.score ?? 0) / (run.total ?? 1)) * 100,
            0,
          ) / completedRuns.length,
        )
      : null;

  const remainingMinutes = estimateRemainingMinutes(
    lessons.map((lesson) => ({
      content: lesson.content?.content ?? null,
      objectivesCount: lesson.objectives.length,
      conceptsCount: lesson.concepts.length,
      exerciseCount: lesson.exercises.filter(
        (exercise) => exercise.quizVersionId === lesson.activeQuizVersionId,
      ).length,
      completed: lesson.status === "COMPLETED",
    })),
  );

  const latestActivity = [latestEvent?.createdAt, latestStudy?.updatedAt]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    course: {
      id: course.id,
      title: course.title,
      status: course.status,
    },
    progress: {
      completedLessons,
      totalLessons: lessons.length,
      percent: progressPercent(completedLessons, lessons.length),
    },
    studySeconds: studyAggregate._sum.seconds ?? 0,
    quizAverage,
    quizRuns: completedRuns.map((run) => ({
      id: run.id,
      lessonTitle: run.lesson.title,
      moduleTitle: run.lesson.module.title,
      score: run.score ?? 0,
      total: run.total ?? 0,
      completedAt: run.completedAt!,
    })),
    concepts,
    lessonEstimates,
    remainingMinutes,
    latestActivity,
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      lessonTitle: event.lesson?.title ?? null,
      moduleTitle: event.lesson?.module.title ?? null,
      metadata: event.metadata,
    })),
  };
}

export async function getUserDashboard(userId: string) {
  const courses = await prisma.course.findMany({
    where: {
      ownerId: userId,
      status: { not: "ARCHIVED" },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              content: { select: { content: true } },
              exercises: { select: { id: true, quizVersionId: true } },
            },
          },
        },
      },
    },
  });

  const [studyAggregate, runs, latestEvent, latestStudy] = await Promise.all([
    prisma.studyTime.aggregate({
      where: { userId },
      _sum: { seconds: true },
    }),
    prisma.quizRun.findMany({
      where: {
        userId,
        completedAt: { not: null },
        total: { gt: 0 },
      },
      select: { score: true, total: true },
    }),
    prisma.learningEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.studyTime.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  let completedLessons = 0;
  let totalLessons = 0;

  const courseProgress = courses.map((course) => {
    const lessons = course.modules.flatMap((module) => module.lessons);
    const completed = lessons.filter(
      (lesson) => lesson.status === "COMPLETED",
    ).length;

    completedLessons += completed;
    totalLessons += lessons.length;

    const remainingMinutes = estimateRemainingMinutes(
      lessons.map((lesson) => ({
        content: lesson.content?.content ?? null,
        objectivesCount: lesson.objectives.length,
        conceptsCount: lesson.concepts.length,
        exerciseCount: lesson.exercises.filter(
        (exercise) => exercise.quizVersionId === lesson.activeQuizVersionId,
      ).length,
        completed: lesson.status === "COMPLETED",
      })),
    );

    return {
      id: course.id,
      title: course.title,
      completed,
      total: lessons.length,
      percent: progressPercent(completed, lessons.length),
      remainingMinutes,
    };
  });

  const quizAverage =
    runs.length > 0
      ? Math.round(
          runs.reduce(
            (sum, run) => sum + ((run.score ?? 0) / (run.total ?? 1)) * 100,
            0,
          ) / runs.length,
        )
      : null;

  const latestActivity = [latestEvent?.createdAt, latestStudy?.updatedAt]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    completedLessons,
    totalLessons,
    progressPercent: progressPercent(completedLessons, totalLessons),
    studySeconds: studyAggregate._sum.seconds ?? 0,
    quizAverage,
    latestActivity,
    courses: courseProgress,
  };
}
