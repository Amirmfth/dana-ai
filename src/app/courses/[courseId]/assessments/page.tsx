import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import {
  getCourseFinalEligibility,
  getModuleAssessmentEligibility,
} from "@/lib/assessments/service";
import { prisma } from "@/lib/db/prisma";

export default async function AssessmentsHubPage({
  params,
}: PageProps<"/courses/[courseId]/assessments">) {
  const user = await requireUser();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
          assessments: {
            where: { type: "MODULE" },
            include: {
              versions: {
                orderBy: { version: "desc" },
                take: 1,
                include: {
                  runs: {
                    where: { userId: user.id, completedAt: { not: null } },
                    orderBy: { completedAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      assessments: {
        where: { type: "COURSE_FINAL" },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              runs: {
                where: { userId: user.id, completedAt: { not: null } },
                orderBy: { completedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  if (course.mode === "FLEXIBLE") {
    return (
      <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
          <Link href={"/courses/" + courseId} className="text-sm font-medium underline underline-offset-4">
            Back to course
          </Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Assessments are off</h1>
          <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
            This is a flexible course. Quizzes, placement tests, test-out flows, module assessments, and the final assessment are disabled.
          </p>
        </div>
      </main>
    );
  }

  const moduleEligibility = await Promise.all(
    course.modules.map((courseModule) =>
      getModuleAssessmentEligibility(user.id, courseId, courseModule.id),
    ),
  );
  const finalEligible = await getCourseFinalEligibility(user.id, courseId);
  const finalRun = course.assessments[0]?.versions[0]?.runs[0] ?? null;

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link
          href={"/courses/" + courseId}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to course
        </Link>

        <header className="mt-5 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <h1 className="text-3xl font-semibold tracking-tight">
            Assessments
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-300">
            Pass each module assessment to advance through the course. The final
            assessment unlocks after all required modules are passed.
          </p>
        </header>

        <section className="py-8">
          <h2 className="text-xl font-semibold">Module assessments</h2>
          <div className="mt-4 space-y-3">
            {course.modules.map((courseModule, index) => {
              const latestRun =
                courseModule.assessments[0]?.versions[0]?.runs[0] ?? null;
              const eligible = moduleEligibility[index];

              return (
                <article
                  key={courseModule.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Module {courseModule.order}
                    </p>
                    <h3 className="mt-1 font-semibold">{courseModule.title}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {latestRun
                        ? latestRun.passed
                          ? "Passed · " + latestRun.score + "%"
                          : "Last attempt · " + latestRun.score + "%"
                        : eligible
                          ? "Ready"
                          : "Complete required lessons first"}
                    </p>
                  </div>

                  {eligible ? (
                    <Link
                      href={
                        "/courses/" +
                        courseId +
                        "/assessments/module/" +
                        courseModule.id
                      }
                      className="inline-flex min-h-10 items-center rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
                    >
                      {latestRun?.passed ? "Review" : "Open assessment"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-neutral-400">
                      Locked
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Course final</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <div>
              <h3 className="font-semibold">{course.title} final assessment</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {finalRun
                  ? finalRun.passed
                    ? "Passed · " + finalRun.score + "%"
                    : "Last attempt · " + finalRun.score + "%"
                  : finalEligible
                    ? "Ready"
                    : "Pass every module assessment first"}
              </p>
            </div>

            {finalEligible ? (
              <Link
                href={"/courses/" + courseId + "/assessments/final"}
                className="inline-flex min-h-11 items-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
              >
                {finalRun?.passed ? "Review final" : "Take final"}
              </Link>
            ) : (
              <span className="text-sm font-medium text-neutral-400">
                Locked
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
