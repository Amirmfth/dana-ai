import Link from "next/link";

import { createCourseAction } from "@/app/actions/courses";
import { signOutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export default async function HomePage() {
  const user = await requireUser();

  const courses = await prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { modules: { include: { lessons: true } } },
  });

  const lessonCount = courses.reduce(
    (total, course) =>
      total +
      course.modules.reduce((sum, module) => sum + module.lessons.length, 0),
    0,
  );

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Dana AI
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/privacy"
              className="min-h-11 rounded-lg px-3 py-3 text-sm font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              Privacy
            </Link>
            <form action={signOutAction}>
              <button className="min-h-11 rounded-lg px-3 text-sm font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white">
                Sign out
              </button>
            </form>
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.78fr)] lg:items-center lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Your learning studio
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Learn the thing you have been meaning to learn.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
              Describe a goal and Dana turns it into a focused course, then
              stays with you in every lesson when you need another explanation.
            </p>
          </div>

          <form
            action={createCourseAction}
            className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
          >
            <label htmlFor="learning-goal" className="text-lg font-semibold">
              Create a course
            </label>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Be specific about your starting point, goal, and what you want to practice.
            </p>
            <textarea
              id="learning-goal"
              name="prompt"
              required
              minLength={10}
              rows={6}
              placeholder="For example: Teach me German from B1 to B2..."
              className="mt-5 w-full resize-none rounded-2xl border border-neutral-300 bg-white p-4 text-base leading-6 outline-none dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="submit"
              className="mt-4 min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
            >
              Create course
            </button>
          </form>
        </section>

        <section className="border-t border-neutral-200 py-10 dark:border-neutral-800 sm:py-14">
          <div className="mb-7 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Your library
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Continue learning
              </h2>
            </div>
            {courses.length > 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {courses.length} courses · {lessonCount} lessons
              </p>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              Your first course will appear here.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const count = course.modules.reduce(
                  (total, module) => total + module.lessons.length,
                  0,
                );

                return (
                  <Link
                    key={course.id}
                    href={"/courses/" + course.id}
                    className="flex min-h-52 flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Course
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {course.description}
                      </p>
                    )}
                    <p className="mt-auto pt-6 text-sm font-medium text-neutral-500">
                      {course.modules.length} modules · {count} lessons
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
