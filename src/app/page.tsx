import Link from "next/link";

export const maxDuration = 300;

import { UserMenu } from "@/components/ui/user-menu";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { CourseComposer } from "@/components/courses/course-composer";

export default async function HomePage() {
  const user = await requireUser();

  const [courses, experienceSettings] = await Promise.all([
    prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
      include: { modules: { include: { lessons: true } } },
    }),
    prisma.userExperienceSettings.findUnique({
      where: { userId: user.id },
      select: { defaultContentLanguage: true },
    }),
  ]);

  const activeCourses = courses.filter((course) => course.status === "ACTIVE");
  const draftCourses = courses.filter((course) => course.status === "DRAFT");
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
          <UserMenu />
        </header>

        <section className="py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Your learning studio
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              What do you want to learn?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg">
              Describe the outcome you want. Attach your own material when it matters, and Dana will turn it into a structured course.
            </p>
          </div>

          <div className="mt-9 sm:mt-11">
            <CourseComposer
              defaultContentLanguage={experienceSettings?.defaultContentLanguage ?? "English"}
            />
          </div>
        </section>



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

        {draftCourses.length > 0 && (
          <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Incomplete course setup</h2>
            <p className="mt-1 text-sm text-neutral-500">
              These courses were created but setup did not finish. Open Sources to inspect attached material.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {draftCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <p className="font-semibold">{course.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Draft · setup incomplete
                  </p>
                  <div className="mt-3 flex gap-3">
                    <Link
                      href={"/courses/" + course.id + "/sources"}
                      className="text-sm font-semibold underline underline-offset-4"
                    >
                      Open sources
                    </Link>
                    <Link
                      href={"/courses/" + course.id + "/manage"}
                      className="text-sm font-semibold underline underline-offset-4"
                    >
                      Manage
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

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
