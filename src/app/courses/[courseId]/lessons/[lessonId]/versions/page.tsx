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

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Lesson content</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Active version: {lesson.contentVersions.find((item) => item.id === lesson.activeContentVersionId)?.version ?? "none"}
              </p>
            </div>
            <form action={regenerateLessonAction.bind(null, courseId, lessonId)}>
              <button className={buttonClass}>Regenerate lesson</button>
            </form>
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
                    {version.createdAt.toLocaleString()}
                  </p>
                </div>
                {version.id !== lesson.activeContentVersionId && (
                  <form
                    action={activateLessonVersionAction.bind(
                      null,
                      courseId,
                      lessonId,
                      version.id,
                    )}
                  >
                    <button className={buttonClass}>Restore</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Quiz</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Active version: {lesson.quizVersions.find((item) => item.id === lesson.activeQuizVersionId)?.version ?? "none"}
              </p>
            </div>
            <form action={regenerateQuizAction.bind(null, courseId, lessonId)}>
              <button className={buttonClass}>Regenerate quiz</button>
            </form>
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
                  <form
                    action={activateQuizVersionAction.bind(
                      null,
                      courseId,
                      lessonId,
                      version.id,
                    )}
                  >
                    <button className={buttonClass}>Restore</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
