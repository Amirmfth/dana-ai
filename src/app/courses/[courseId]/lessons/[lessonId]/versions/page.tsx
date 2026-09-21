import Link from "next/link";
import { notFound } from "next/navigation";

import {
  activateLessonVersionAction,
  activateQuizVersionAction,
  regenerateLessonAction,
  regenerateQuizAction,
} from "@/app/courses/[courseId]/regenerate/actions";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

export default async function LessonVersionsPage({
  params,
}: PageProps<"/courses/[courseId]/lessons/[lessonId]/versions">) {
  const user = await requireUser();
  const { courseId, lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: {
        courseId,
        course: { ownerId: user.id },
      },
    },
    include: {
      contentVersions: {
        orderBy: { version: "desc" },
        include: {
          _count: { select: { citations: true } },
        },
      },
      generationJobs: {
        select: {
          kind: true,
          status: true,
          errorMessage: true,
          startedAt: true,
          attemptCount: true,
        },
      },
      quizVersions: {
        orderBy: { version: "desc" },
        include: {
          _count: {
            select: {
              exercises: true,
              quizRuns: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) notFound();

  const contentJob = lesson.generationJobs.find(
    (job) => job.kind === "LESSON_CONTENT",
  );
  const quizJob = lesson.generationJobs.find(
    (job) => job.kind === "LESSON_QUIZ",
  );

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link
          href={"/courses/" + courseId + "/lessons/" + lessonId}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to lesson
        </Link>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Versions & regeneration
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Regeneration creates a new immutable version. Previous versions and
          assessment history are preserved.
        </p>

        {contentJob?.status === "GENERATING" && (
          <div className="mt-8">
            <GenerationSkeleton
              title="Lesson generation in progress"
              description={
                "Attempt " +
                contentJob.attemptCount +
                " is active. This state is persisted and survives refreshes."
              }
              stages={[
                "Preparing lesson context",
                "Retrieving memories and sources",
                "Generating lesson content",
                "Saving the new version",
              ]}
              activeStage={2}
            />
          </div>
        )}

        {contentJob?.status === "FAILED" && contentJob.errorMessage && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Lesson generation failed: {contentJob.errorMessage}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Lesson content</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Active version: {lesson.contentVersions.find((item) => item.id === lesson.activeContentVersionId)?.version ?? "none"}
              </p>
            </div>
            <AsyncActionForm action={regenerateLessonAction.bind(null, courseId, lessonId)}>
              <PendingActionButton
                className={buttonClass}
                pendingLabel="Regenerating lesson…"
              >
                Regenerate lesson
              </PendingActionButton>
            </AsyncActionForm>
          </div>

          <div className="mt-5 space-y-3">
            {lesson.contentVersions.map((version) => (
              <article
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div>
                  <p className="font-semibold">
                    Version {version.version}
                    {version.id === lesson.activeContentVersionId ? " · Active" : ""}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {version.createdAt.toLocaleString()} · {version._count.citations} source citations
                  </p>
                </div>
                {version.id !== lesson.activeContentVersionId && (
                  <AsyncActionForm
                    action={activateLessonVersionAction.bind(
                      null,
                      courseId,
                      lessonId,
                      version.id,
                    )}
                  >
                    <PendingActionButton
                      className={buttonClass}
                      pendingLabel="Restoring…"
                    >
                      Restore
                    </PendingActionButton>
                  </AsyncActionForm>
                )}
              </article>
            ))}
          </div>
        </section>

        {quizJob?.status === "GENERATING" && (
          <div className="mt-6">
            <GenerationSkeleton
              title="Quiz generation in progress"
              description={
                "Attempt " +
                quizJob.attemptCount +
                " is active. Previous quiz versions remain available."
              }
              stages={[
                "Reading lesson objectives",
                "Selecting assessment coverage",
                "Generating questions",
                "Saving the quiz version",
              ]}
              activeStage={2}
            />
          </div>
        )}

        {quizJob?.status === "FAILED" && quizJob.errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Quiz generation failed: {quizJob.errorMessage}
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Quiz</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Active version: {lesson.quizVersions.find((item) => item.id === lesson.activeQuizVersionId)?.version ?? "none"}
              </p>
            </div>
            <AsyncActionForm action={regenerateQuizAction.bind(null, courseId, lessonId)}>
              <PendingActionButton
                className={buttonClass}
                pendingLabel="Regenerating quiz…"
              >
                Regenerate quiz
              </PendingActionButton>
            </AsyncActionForm>
          </div>

          <div className="mt-5 space-y-3">
            {lesson.quizVersions.map((version) => (
              <article
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div>
                  <p className="font-semibold">
                    Version {version.version}
                    {version.id === lesson.activeQuizVersionId ? " · Active" : ""}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {version._count.exercises} questions · {version._count.quizRuns} runs · {version.createdAt.toLocaleString()}
                  </p>
                </div>
                {version.id !== lesson.activeQuizVersionId && (
                  <AsyncActionForm
                    action={activateQuizVersionAction.bind(
                      null,
                      courseId,
                      lessonId,
                      version.id,
                    )}
                  >
                    <PendingActionButton className={buttonClass} pendingLabel="Restoring…" successLabel="Restored" errorLabel="Try again">Restore</PendingActionButton>
                  </AsyncActionForm>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
