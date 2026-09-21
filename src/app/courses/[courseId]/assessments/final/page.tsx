import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentRunner } from "@/components/assessments/assessment-runner";
import { requireUser } from "@/lib/auth/server";
import {
  ensureCourseFinalAssessment,
  getOrCreateAssessmentRun,
} from "@/lib/assessments/service";
import { prisma } from "@/lib/db/prisma";
import { retakeAssessmentAction } from "@/app/courses/[courseId]/assessment-actions";
import { regenerateCourseFinalAssessmentAction } from "@/app/courses/[courseId]/assessments/actions";
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

export default async function CourseFinalAssessmentPage({
  params,
}: PageProps<"/courses/[courseId]/assessments/final">) {
  const user = await requireUser();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    select: { id: true, title: true },
  });
  if (!course) notFound();

  const version = await ensureCourseFinalAssessment(user.id, courseId);

  const fullVersion = await prisma.assessmentVersion.findUnique({
    where: { id: version.id },
    include: {
      assessment: true,
      questions: {
        orderBy: { order: "asc" },
        include: {
          targetLesson: {
            select: {
              module: { select: { id: true, title: true } },
            },
          },
        },
      },
      runs: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        include: {
          answers: true,
        },
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

  const answerMap = new Map(
    latest?.answers.map((answer) => [answer.questionId, answer.result]) ?? [],
  );
  const moduleBreakdown = new Map<
    string,
    { title: string; correct: number; total: number }
  >();

  if (latest?.completedAt) {
    for (const question of fullVersion.questions) {
      const courseModule = question.targetLesson?.module;
      if (!courseModule) continue;

      const current = moduleBreakdown.get(courseModule.id) ?? {
        title: courseModule.title,
        correct: 0,
        total: 0,
      };
      current.total += 1;
      if (answerMap.get(question.id) === "CORRECT") {
        current.correct += 1;
      }
      moduleBreakdown.set(courseModule.id, current);
    }
  }

  const returnPath = "/courses/" + courseId + "/assessments/final";

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
            Course final
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {course.title} final assessment
          </h1>
          <p className="mt-2 text-neutral-500">
            Passing score: {fullVersion.assessment.passingScore}% · Version{" "}
            {fullVersion.version}
          </p>
        </header>

        {run.completedAt ? (
          <section className="py-8">
            <CompletionFeedback
              title={run.passed ? "Course final passed" : "Final assessment complete"}
              description={
                run.passed
                  ? "You've completed the course requirements."
                  : "Review weak modules and try again when you're ready."
              }
            >
              <p className="mt-3 text-4xl font-semibold">{run.score}%</p>

              {moduleBreakdown.size > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[...moduleBreakdown.entries()].map(([id, item]) => (
                    <div
                      key={id}
                      className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
                    >
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {Math.round((item.correct / item.total) * 100)}%
                      </p>
                      <p className="text-xs text-neutral-500">
                        {item.correct}/{item.total} correct
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
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
                    Retake final
                  </PendingActionButton>
                </AsyncActionForm>
                <AsyncActionForm
                  action={regenerateCourseFinalAssessmentAction.bind(
                    null,
                    courseId,
                    returnPath,
                  )}
                >
                  <PendingActionButton
                    className="min-h-11 rounded-xl border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700"
                    pendingLabel="Regenerating final…"
                  >
                    Regenerate final
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
