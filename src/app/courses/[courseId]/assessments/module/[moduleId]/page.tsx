import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentRunner } from "@/components/assessments/assessment-runner";
import { requireUser } from "@/lib/auth/server";
import {
  ensureModuleAssessment,
  getOrCreateAssessmentRun,
} from "@/lib/assessments/service";
import { prisma } from "@/lib/db/prisma";
import { retakeAssessmentAction } from "@/app/courses/[courseId]/assessment-actions";
import { regenerateModuleAssessmentAction } from "@/app/courses/[courseId]/assessments/actions";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { CompletionFeedback } from "@/components/ui/completion-feedback";

function optionsFrom(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "options" in data &&
    Array.isArray((data as { options?: unknown }).options)
  ) {
    return (data as { options: unknown[] }).options.filter(
      (value): value is string => typeof value === "string",
    );
  }
  return [];
}

export default async function ModuleAssessmentPage({
  params,
}: PageProps<"/courses/[courseId]/assessments/module/[moduleId]">) {
  const user = await requireUser();
  const { courseId, moduleId } = await params;

  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId,
      course: { ownerId: user.id },
    },
    select: {
      id: true,
      title: true,
      order: true,
      course: { select: { title: true } },
    },
  });
  if (!courseModule) notFound();

  const version = await ensureModuleAssessment(
    user.id,
    courseId,
    moduleId,
  );

  const fullVersion = await prisma.assessmentVersion.findUnique({
    where: { id: version.id },
    include: {
      assessment: true,
      questions: { orderBy: { order: "asc" } },
      runs: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (!fullVersion) notFound();

  const latest = fullVersion.runs[0];
  const run =
    latest?.completedAt
      ? latest
      : latest ??
        (await getOrCreateAssessmentRun(user.id, fullVersion.id));

  const versions = await prisma.assessmentVersion.findMany({
    where: { assessmentId: fullVersion.assessmentId },
    orderBy: { version: "desc" },
    include: {
      runs: {
        where: {
          userId: user.id,
          completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
      },
      _count: { select: { questions: true } },
    },
  });

  const returnPath =
    "/courses/" + courseId + "/assessments/module/" + moduleId;

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link
          href={"/courses/" + courseId + "/assessments"}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to assessments
        </Link>

        <header className="mt-5 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Module {courseModule.order}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {courseModule.title} assessment
          </h1>
          <p className="mt-2 text-neutral-500">
            Passing score: {fullVersion.assessment.passingScore}% · Version{" "}
            {fullVersion.version}
          </p>
        </header>

        {run.completedAt ? (
          <section className="py-8">
            <CompletionFeedback
              title={
                run.passed
                  ? "Module assessment passed"
                  : "Assessment complete"
              }
              description={
                run.passed
                  ? "The next module can now unlock."
                  : "Review the module and try again when you're ready."
              }
            >
              <p className="mt-3 text-3xl font-semibold">{run.score}%</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <AsyncActionForm
                  action={retakeAssessmentAction.bind(
                    null,
                    courseId,
                    fullVersion.id,
                    returnPath,
                  )}
                >
                  <PendingActionButton
                    className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
                    pendingLabel="Preparing retake…"
                  >
                    Retake
                  </PendingActionButton>
                </AsyncActionForm>
                <AsyncActionForm
                  action={regenerateModuleAssessmentAction.bind(
                    null,
                    courseId,
                    moduleId,
                    returnPath,
                  )}
                >
                  <PendingActionButton
                    className="min-h-11 rounded-xl border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700"
                    pendingLabel="Regenerating…"
                  >
                    Regenerate assessment
                  </PendingActionButton>
                </AsyncActionForm>
              </div>
            </CompletionFeedback>
          </section>
        ) : (
          <section className="py-8">
            <AssessmentRunner
              runId={run.id}
              questions={fullVersion.questions.map((question) => ({
                id: question.id,
                question: question.question,
                options: optionsFrom(question.data),
                order: question.order,
              }))}
            />
          </section>
        )}

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Version & attempt history</h2>
          <div className="mt-4 space-y-3">
            {versions.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">
                    Version {item.version} · {item._count.questions} questions
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.createdAt.toLocaleString()}
                  </p>
                </div>
                {item.runs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.runs.map((attempt) => (
                      <span
                        key={attempt.id}
                        className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium dark:bg-neutral-800"
                      >
                        {attempt.score}% · {attempt.passed ? "passed" : "failed"}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
