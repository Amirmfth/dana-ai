import Link from "next/link";

import { LearningDashboard } from "@/components/analytics/learning-dashboard";
import { UserMenu } from "@/components/ui/user-menu";
import { requireUser } from "@/lib/auth/server";
import { getUserDashboard } from "@/lib/analytics/course";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const dashboard = await getUserDashboard(user.id);

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Dana AI
          </Link>
          <UserMenu />
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-sm font-medium text-neutral-500">Your learning</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-neutral-600 dark:text-neutral-300">
            Review progress, study time, quiz performance, and how your courses are moving forward.
          </p>
        </section>

        {dashboard.totalLessons === 0 ? (
          <section className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">No learning data yet</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Create a course and start a lesson. Your progress and activity will appear here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
            >
              Create a course
            </Link>
          </section>
        ) : (
          <LearningDashboard dashboard={dashboard} showHeading={false} />
        )}
      </div>
    </main>
  );
}
