import Link from "next/link";
import { notFound } from "next/navigation";

import {
  applyRevisionAction,
  regenerateCourseAction,
  regenerateModuleAction,
} from "@/app/courses/[courseId]/regenerate/actions";
import { requireUser } from "@/lib/auth/server";
import { getOwnedCourse } from "@/lib/courses/management";
import { prisma } from "@/lib/db/prisma";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

export default async function CourseRegeneratePage({
  params,
}: PageProps<"/courses/[courseId]/regenerate">) {
  const user = await requireUser();
  const { courseId } = await params;
  const course = await getOwnedCourse(user.id, courseId);

  if (!course) notFound();

  const [revisions, regenerationLocks] = await Promise.all([
    prisma.curriculumRevision.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.regenerationLock.findMany({
      where: {
        ownerId: user.id,
        OR: [
          { target: "CURRICULUM", targetId: courseId },
          {
            target: "MODULE",
            targetId: { in: course.modules.map((item) => item.id) },
          },
        ],
      },
    }),
  ]);

  const courseLock = regenerationLocks.find(
    (lock) => lock.target === "CURRICULUM" && lock.targetId === courseId,
  );

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link
          href={"/courses/" + courseId + "/manage"}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to manage
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Curriculum regeneration
            </h1>
            <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-300">
              AI regeneration creates a reviewable revision first. Applying it
              updates matching modules and lessons and adds new material, but it
              never automatically deletes existing learner work.
            </p>
          </div>
          <form action={regenerateCourseAction.bind(null, courseId)}>
            <PendingActionButton
              className={buttonClass}
              pendingLabel="Generating revision…"
            >
              Generate course revision
            </PendingActionButton>
          </form>
        </div>

        {courseLock?.status === "GENERATING" && (
          <div className="mt-8">
            <GenerationSkeleton
              title="Course revision in progress"
              description="Dana is preparing a reviewable curriculum revision. Existing curriculum remains active until you apply it."
              stages={[
                "Reading current curriculum",
                "Retrieving relevant course sources",
                "Generating the revision",
                "Saving revision history",
              ]}
              activeStage={2}
            />
          </div>
        )}

        {courseLock?.status === "FAILED" && courseLock.errorMessage && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Course regeneration failed: {courseLock.errorMessage}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Regenerate a module</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {course.modules.map((courseModule) => {
              const moduleLock = regenerationLocks.find(
                (lock) =>
                  lock.target === "MODULE" &&
                  lock.targetId === courseModule.id,
              );

              return (
              <article
                key={courseModule.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div>
                  <p className="font-semibold">{courseModule.title}</p>
                  <p className="text-xs text-neutral-500">
                    {courseModule.lessons.length} lessons
                  </p>
                </div>
                <form
                  action={regenerateModuleAction.bind(
                    null,
                    courseId,
                    courseModule.id,
                  )}
                >
                  <PendingActionButton
                    className={buttonClass}
                    pendingLabel="Regenerating…"
                  >
                    Regenerate
                  </PendingActionButton>
                </form>
                {moduleLock?.status === "GENERATING" && (
                  <p className="w-full text-xs font-medium text-neutral-500">
                    Regeneration in progress…
                  </p>
                )}
                {moduleLock?.status === "FAILED" && moduleLock.errorMessage && (
                  <p className="w-full text-xs text-red-600 dark:text-red-300">
                    {moduleLock.errorMessage}
                  </p>
                )}
              </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Revision history</h2>
          {revisions.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              No curriculum revisions yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {revisions.map((revision) => (
                <article
                  key={revision.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div>
                    <p className="font-semibold">
                      {revision.scope === "COURSE" ? "Course" : "Module"} revision v{revision.version}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {revision.status} · {revision.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <form
                    action={applyRevisionAction.bind(
                      null,
                      courseId,
                      revision.id,
                    )}
                  >
                    <PendingActionButton
                      className={buttonClass}
                      pendingLabel="Applying revision…"
                    >
                      {revision.status === "APPLIED" ? "Apply again" : "Apply revision"}
                    </PendingActionButton>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
