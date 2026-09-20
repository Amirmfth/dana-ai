import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentRunner } from "@/components/assessments/assessment-runner";
import { requireUser } from "@/lib/auth/server";
import {
  ensurePlacementAssessment,
  getOrCreateAssessmentRun,
} from "@/lib/assessments/service";
import { prisma } from "@/lib/db/prisma";
import { retakeAssessmentAction } from "@/app/courses/[courseId]/assessment-actions";

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

export default async function PlacementPage({
  params,
}: PageProps<"/courses/[courseId]/placement">) {
  const user = await requireUser();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    select: { id: true, title: true },
  });
  if (!course) notFound();

  const version = await ensurePlacementAssessment(user.id, courseId);

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

  const returnPath = "/courses/" + courseId + "/placement";

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
          Placement test
        </h1>
        <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
          This assessment checks what you already know. Correctly demonstrated
          lessons can be marked as tested out, while the rest of the curriculum
          stays available for normal study.
        </p>

        {run.completedAt ? (
          <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-neutral-500">Result</p>
            <p className="mt-2 text-4xl font-semibold">{run.score}%</p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Placement complete. Your course progression has been updated from
              demonstrated knowledge.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={"/courses/" + courseId}
                className="inline-flex min-h-11 items-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
              >
                Continue course
              </Link>
              <form
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
              </form>
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
