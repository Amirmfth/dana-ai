import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LessonContent } from "@/components/lessons/lesson-content";
import { LessonTableOfContents } from "@/components/lessons/lesson-table-of-contents";
import { LessonWorkspace } from "@/components/lessons/lesson-workspace";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { getOrGenerateLesson } from "@/lib/lessons/get-or-generate-lesson";
import { markLessonStarted } from "@/lib/lessons/progress";
import { LessonCompletion } from "@/components/lessons/lesson-completion";
import { getOrGenerateQuiz } from "@/lib/exercises/get-or-generate-quiz";
import { LessonQuiz } from "@/components/exercises/lesson-quiz";
import { LessonStudyTracker } from "@/components/analytics/lesson-study-tracker";
import { estimateLessonMinutes } from "@/lib/analytics/estimates";
import { skipLessonAction } from "@/app/actions/lessons";
import { CompletionFeedback } from "@/components/ui/completion-feedback";

type LessonPageProps = {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
  searchParams: Promise<{
    completedPrevious?: string;
  }>;
};

export default async function LessonPage({
  params,
  searchParams,
}: LessonPageProps) {
  const user = await requireUser();
  const { courseId, lessonId } = await params;
  const query = await searchParams;

  const [lessonInfo, experienceSettings] = await Promise.all([
    prisma.lesson.findFirst({
      where: { id: lessonId, module: { courseId, course: { ownerId: user.id } } },
      include: { module: true },
    }),
    prisma.userExperienceSettings.findUnique({
      where: { userId: user.id },
    }),
  ]);

  if (!lessonInfo) {
    notFound();
  }

  if (lessonInfo.status === "LOCKED") {
    redirect(`/courses/${courseId}`);
  }

  await markLessonStarted(user.id, lessonId);

  const conversation = await prisma.conversation.findFirst({
    where: {
      courseId,
      lessonId,
      scope: "LESSON",
    },

    orderBy: {
      updatedAt: "desc",
    },

    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const initialConversation = conversation
    ? {
        id: conversation.id,
        messages: conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
      }
    : undefined;

  const lesson = await getOrGenerateLesson(user.id, lessonId);
  const citationState = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      activeContentVersion: {
        select: {
          citations: {
            orderBy: { createdAt: "asc" },
            include: {
              sourceChunk: {
                include: {
                  source: {
                    select: {
                      title: true,
                      type: true,
                      originalUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const citations =
    citationState?.activeContentVersion?.citations.map((citation) => ({
      id: citation.id,
      marker: citation.marker,
      location: citation.location,
      sourceTitle: citation.sourceChunk.source.title,
      sourceType: citation.sourceChunk.source.type,
      originalUrl: citation.sourceChunk.source.originalUrl,
      pageStart: citation.sourceChunk.pageStart,
      pageEnd: citation.sourceChunk.pageEnd,
      heading: citation.sourceChunk.heading,
    })) ?? [];

  const quiz = await getOrGenerateQuiz(user.id, lessonId);
  const quizExercises = quiz.exercises.map((exercise) => {
    const latestAttempt = exercise.attempts[0];

    return {
      id: exercise.id,

      type: exercise.type,

      question: exercise.question,

      data: exercise.data,

      explanation: exercise.explanation,

      order: exercise.order,

      attempts: latestAttempt
        ? [
            {
              id: latestAttempt.id,

              answer: latestAttempt.answer,

              result: latestAttempt.result,

              createdAt: latestAttempt.createdAt.toISOString(),

              /*
               * Only expose the answer key after this
               * exercise has already been answered.
               */
              answerKey: exercise.answerKey,
            },
          ]
        : [],
    };
  });
  const estimatedMinutes = estimateLessonMinutes({
    content: lesson,
    objectivesCount: lessonInfo.objectives.length,
    conceptsCount: lessonInfo.concepts.length,
    exerciseCount: quiz.exercises.length,
  });

  const tocSections = lesson.sections.map((section, index) => ({
    id: `lesson-section-${index}`,
    title: section.title || `Section ${index + 1}`,
  }));

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-white text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50"
    >
      <LessonStudyTracker lessonId={lessonId} />
      <LessonWorkspace
        lessonId={lessonId}
        conversation={initialConversation}
        preferences={{
          fontSize: experienceSettings?.fontSize ?? "DEFAULT",
          lineHeight: experienceSettings?.lineHeight ?? "NORMAL",
          readingWidth: experienceSettings?.readingWidth ?? "STANDARD",
          readingDensity: experienceSettings?.readingDensity ?? "COMFORTABLE",
          motionPreference: experienceSettings?.motionPreference ?? "SYSTEM",
          highContrast: experienceSettings?.highContrast ?? false,
          dyslexiaFriendly: experienceSettings?.dyslexiaFriendly ?? false,
        }}
      >
        <div className="lesson-distraction mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:max-w-none lg:px-12 lg:pb-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-600 underline-offset-4 transition hover:text-neutral-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white"
            >
              Back to {lessonInfo.module.title}
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href={"/courses/" + courseId + "/lessons/" + lessonId + "/versions"}
                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
              >
                Versions
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {query.completedPrevious === "1" && (
            <div className="mx-auto mb-8 w-full max-w-2xl lg:translate-x-8">
              <CompletionFeedback
                title="Previous lesson completed"
                description="Your progress was saved. This lesson is now available based on your prerequisites."
              />
            </div>
          )}

          <header className="mb-10 border-b border-neutral-200 pb-9 sm:mb-12 sm:pb-10 dark:border-neutral-800">
            <div className="lesson-reading-column mx-auto w-full max-w-2xl lg:translate-x-8">
              <p className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Module {lessonInfo.module.order}{" "}
                <span aria-hidden="true">·</span> Lesson {lessonInfo.order}
                <span aria-hidden="true"> · </span>~{estimatedMinutes} min
                <span aria-hidden="true"> · </span>{lessonInfo.difficulty.toLowerCase()}
                {lessonInfo.isOptional ? " · optional" : ""}
              </p>

              <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white sm:text-4xl">
                {lesson.title}
              </h1>

              {lessonInfo.description && (
                <p className="mt-5 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
                  {lessonInfo.description}
                </p>
              )}
            </div>
          </header>
        </div>

        <div className="px-5 pb-24 sm:px-8 lg:grid lg:grid-cols-[2rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-12 lg:pb-12">
          <div className="lesson-toc-container">
            <LessonTableOfContents sections={tocSections} />
          </div>

          <div className="min-w-0">
            <div className="lesson-reading-column mx-auto w-full max-w-2xl">
              <div className="lesson-distraction mb-6 flex flex-wrap gap-2">
                <Link
                  href={"/courses/" + courseId + "/lessons/" + lessonId + "/test-out"}
                  className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 px-3 text-sm font-semibold dark:border-neutral-700"
                >
                  Test out of this lesson
                </Link>
                {lessonInfo.isOptional && lessonInfo.status !== "COMPLETED" && (
                  <form action={skipLessonAction}>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <button className="min-h-10 rounded-lg border border-neutral-300 px-3 text-sm font-semibold dark:border-neutral-700">
                      Skip optional lesson
                    </button>
                  </form>
                )}
              </div>
              <LessonContent lesson={lesson} citations={citations} />
              <LessonQuiz
                exercises={quizExercises}
                lessonId={lessonId}
                quizRunId={quiz.run.id}
              />

              <LessonCompletion
                courseId={courseId}
                lessonId={lessonId}
                isCompleted={lessonInfo.status === "COMPLETED"}
              />
            </div>
          </div>
        </div>
      </LessonWorkspace>
    </main>
  );
}
