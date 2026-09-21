import Link from "next/link";

import { completeLessonAction } from "@/app/actions/lessons";
import { CompletionFeedback } from "@/components/ui/completion-feedback";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { PendingActionButton } from "@/components/ui/pending-action-button";

type LessonCompletionProps = {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
};

export function LessonCompletion({
  lessonId,
  courseId,
  isCompleted,
}: LessonCompletionProps) {
  if (isCompleted) {
    return (
      <section className="mt-16 border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <CompletionFeedback
          title="Lesson completed"
          description="Your progress is saved and prerequisite unlocks have been recalculated."
        >
              <Link
                href={`/courses/${courseId}`}
                className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
              >
                Back to course
              </Link>
        </CompletionFeedback>
      </section>
    );
  }

  return (
    <section className="mt-16 border-t border-neutral-200 pt-10 dark:border-neutral-800">
      <div className="rounded-2xl bg-neutral-950 p-6 text-white dark:bg-white dark:text-neutral-950 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
          End of lesson
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Ready to continue?
        </h2>

        <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-300 dark:text-neutral-600">
          Mark this lesson complete to update your
          progress and unlock the next lesson.
        </p>

        <AsyncActionForm
          action={completeLessonAction}
          className="mt-6"
          pendingMessage="Completing lesson and updating progress…"
          errorMessage="The lesson could not be completed. Please try again."
        >
          <input
            type="hidden"
            name="lessonId"
            value={lessonId}
          />

          <input
            type="hidden"
            name="courseId"
            value={courseId}
          />

          <PendingActionButton
            pendingLabel="Completing lesson…"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:outline-neutral-950"
          >
            Complete and continue
            <ArrowIcon />
          </PendingActionButton>
        </AsyncActionForm>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
    >
      <path
        d="M4 10h12m-4-4 4 4-4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}