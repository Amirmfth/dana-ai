import Link from "next/link";

import { createCourseAction } from "@/app/actions/courses";
import { signOutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { getUserDashboard } from "@/lib/analytics/course";
import { LearningDashboard } from "@/components/analytics/learning-dashboard";

export default async function HomePage() {
  const user = await requireUser();

  const [courses, dashboard] = await Promise.all([
    prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
      include: { modules: { include: { lessons: true } } },
    }),
    getUserDashboard(user.id),
  ]);

  const activeCourses = courses.filter((course) => course.status !== "ARCHIVED");
  const archivedCourses = courses.filter((course) => course.status === "ARCHIVED");

  const lessonCount = activeCourses.reduce(
    (total, course) => total + course.modules.reduce((sum, module) => sum + module.lessons.length, 0),
    0,
  );

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-lg text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:focus-visible:outline-white">
            Dana AI
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white">
              Search
            </Link>
            <Link href="/settings/memory" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white">
              Memory
            </Link>
            <Link href="/templates" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white">
              Templates
            </Link>
            <Link href="/settings/privacy" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white">
              Privacy
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white">
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
              Describe a goal and Dana turns it into a focused course, then stays with you in every lesson when you need another explanation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">Structured roadmap</span>
              <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">Lesson-aware tutor</span>
            </div>
          </div>

          <form action={createCourseAction} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
            <div className="mb-5">
              <label htmlFor="learning-goal" className="text-lg font-semibold">Create a course</label>
              <p id="learning-goal-help" className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                Tell Dana your goal, current level, available time, and preferred learning style.
              </p>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Current level
                <select name="currentLevel" defaultValue="BEGINNER" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950">
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Target level
                <select name="targetLevel" defaultValue="INTERMEDIATE" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950">
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Weekly study time
                <select name="weeklyStudyMinutes" defaultValue="300" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950">
                  <option value="120">2 hours / week</option>
                  <option value="300">5 hours / week</option>
                  <option value="600">10 hours / week</option>
                  <option value="900">15 hours / week</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Learning style
                <select name="learningStyle" defaultValue="BALANCED" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950">
                  <option value="BALANCED">Balanced</option>
                  <option value="PRACTICAL">Practical</option>
                  <option value="CONCEPTUAL">Conceptual</option>
                  <option value="PROJECT_BASED">Project-based</option>
                </select>
              </label>
            </div>

            <details className="mb-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <summary className="cursor-pointer text-sm font-semibold">
                Add source material (optional)
              </summary>
              <div className="mt-4 grid gap-4">
                <label className="text-sm font-medium">
                  PDF / text file
                  <input
                    type="file"
                    name="sourceFile"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    className="mt-2 block w-full text-sm"
                  />
                </label>
                <label className="text-sm font-medium">
                  Public URL
                  <input
                    type="url"
                    name="sourceUrl"
                    placeholder="https://docs.example.com/guide"
                    className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </label>
                <label className="text-sm font-medium">
                  Notes title
                  <input
                    name="sourceTitle"
                    placeholder="My study notes"
                    className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </label>
                <label className="text-sm font-medium">
                  Pasted notes
                  <textarea
                    name="sourceText"
                    rows={4}
                    placeholder="Paste notes or reference material…"
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </label>
              </div>
            </details>

            <textarea
              id="learning-goal"
              name="prompt"
              required
              minLength={10}
              rows={6}
              aria-describedby="learning-goal-help"
              placeholder="For example: Teach me German from B1 to B2, with grammar, vocabulary, writing, and practical conversation."
              className="w-full resize-none rounded-2xl border border-neutral-300 bg-white p-4 text-base leading-6 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-white dark:focus:ring-white/20"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">A clear goal creates a more useful plan.</p>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
              >
                Create course
              </button>
            </div>
          </form>
        </section>

        <LearningDashboard dashboard={dashboard} />

        <section aria-labelledby="courses-heading" className="border-t border-neutral-200 py-10 dark:border-neutral-800 sm:py-14">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Your library</p>
              <h2 id="courses-heading" className="mt-1 text-2xl font-semibold tracking-tight">Continue learning</h2>
            </div>
            {activeCourses.length > 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">{activeCourses.length} courses · {lessonCount} lessons</p>}
          </div>

          {activeCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              Your first course will appear here. Start with a learning goal above.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeCourses.map((course) => {
                const courseLessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group flex min-h-52 flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 motion-reduce:transform-none dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:shadow-none dark:focus-visible:outline-white"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Course</p>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">{course.title}</h3>
                    {course.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{course.description}</p>}
                    <p className="mt-auto pt-6 text-sm font-medium text-neutral-500 dark:text-neutral-400">{course.modules.length} modules · {courseLessonCount} lessons</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {archivedCourses.length > 0 && (
          <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                Archived courses ({archivedCourses.length})
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {archivedCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={"/courses/" + course.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <p className="font-semibold">{course.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">Archived</p>
                  </Link>
                ))}
              </div>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
