import Link from "next/link";

import { completeLessonAction } from "@/app/actions/lessons";

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
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
              <CheckIcon />
            </span>

            <div>
              <h2 className="font-semibold">
                Lesson completed
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                You&apos;ve completed this lesson.
              </p>

              <Link
                href={`/courses/${courseId}`}
                className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
              >
                Back to course
              </Link>
            </div>
          </div>
        </div>
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

        <form
          action={completeLessonAction}
          className="mt-6"
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

          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:outline-neutral-950"
          >
            Complete and continue
            <ArrowIcon />
          </button>
        </form>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-5"
    >
      <path
        d="m5 10 3 3 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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