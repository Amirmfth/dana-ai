import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentRunner } from "@/components/assessments/assessment-runner";
import { requireUser } from "@/lib/auth/server";
import {
  ensureTestOutAssessment,
  getOrCreateAssessmentRun,
} from "@/lib/assessments/service";
import { prisma } from "@/lib/db/prisma";
import { retakeAssessmentAction } from "@/app/courses/[courseId]/assessment-actions";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { PendingActionButton } from "@/components/ui/pending-action-button";

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

export default async function TestOutPage({
  params,
}: PageProps<"/courses/[courseId]/lessons/[lessonId]/test-out">) {
  const user = await requireUser();
  const { courseId, lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { courseId, course: { ownerId: user.id } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      completionMethod: true,
    },
  });
  if (!lesson) notFound();

  if (lesson.status === "COMPLETED") {
    return (
      <main className="min-h-dvh bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="mx-auto max-w-2xl">
          <Link href={"/courses/" + courseId}>Back to course</Link>
          <h1 className="mt-5 text-3xl font-semibold">{lesson.title}</h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300">
            This lesson is already completed
            {lesson.completionMethod === "TESTED_OUT"
              ? " through a test-out assessment."
              : "."}
          </p>
        </div>
      </main>
    );
  }

  const version = await ensureTestOutAssessment(
    user.id,
    courseId,
    lessonId,
  );

  const fullVersion = await prisma.assessmentVersion.findUnique({
    where: { id: version.id },
    include: {
      assessment: true,
      questions: { orderBy: { order: "asc" } },
      runs: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          answers: { select: { questionId: true } },
        },
      },
    },
  });
  if (!fullVersion) notFound();

  const latest = fullVersion.runs[0];
  const run =
    latest ??
    (await getOrCreateAssessmentRun(user.id, fullVersion.id));
  const answeredQuestionIds = new Set(
    latest?.answers.map((answer) => answer.questionId) ?? [],
  );
  const returnPath =
    "/courses/" + courseId + "/lessons/" + lessonId + "/test-out";

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link
          href={"/courses/" + courseId}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to course
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Test out: {lesson.title}
        </h1>
        <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
          Score at least {fullVersion.assessment.passingScore}% to demonstrate
          mastery and satisfy this lesson without studying it normally.
        </p>

        {run.completedAt ? (
          <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-neutral-500">Result</p>
            <p className="mt-2 text-4xl font-semibold">{run.score}%</p>
            <p className="mt-2 font-medium">
              {run.passed
                ? "Passed — the lesson has been marked as tested out."
                : "Not passed — study the lesson or try again."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={"/courses/" + courseId}
                className="inline-flex min-h-11 items-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
              >
                Back to course
              </Link>
              {!run.passed && (
                <AsyncActionForm
                  action={retakeAssessmentAction.bind(
                    null,
                    courseId,
                    fullVersion.id,
                    returnPath,
                  )}
                >
                  <button className="min-h-11 rounded-xl border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700">
                    Retake
                  </button>
                </AsyncActionForm>
              )}
            </div>
          </section>
        ) : (
          <div className="mt-8">
            <AssessmentRunner
              runId={run.id}
              questions={fullVersion.questions
                .filter((question) => !answeredQuestionIds.has(question.id))
                .map((question) => ({
                  id: question.id,
                  question: question.question,
                  options: optionsFrom(question.data),
                  order: question.order,
                }))}
            />
          </div>
        )}
      </div>
    </main>
  );
}
