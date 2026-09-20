"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function LessonError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ courseId: string }>();

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50 px-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-semibold">Dana AI</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          We could not prepare this lesson
        </h1>
        <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
          If lesson or quiz generation failed, retrying will safely start a new
          attempt. If another request is already generating it, Dana will reuse
          that result instead of generating a duplicate.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
          >
            Retry generation
          </button>
          <Link
            href={"/courses/" + params.courseId}
            className="inline-flex min-h-11 items-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700"
          >
            Back to course
          </Link>
        </div>
      </section>
    </main>
  );
}
