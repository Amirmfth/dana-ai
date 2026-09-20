"use client";

import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50 px-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-semibold">Dana AI</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
          The request did not finish successfully. You can retry it safely.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700"
          >
            Back to courses
          </Link>
        </div>
      </section>
    </main>
  );
}
