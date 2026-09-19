import Link from "next/link";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { prisma } from "@/lib/db/prisma";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!course) notFound();

  const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-neutral-600 underline-offset-4 transition hover:text-neutral-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white"
          >
            Back to courses
          </Link>
          <ThemeToggle />
        </header>

        <section className="border-b border-neutral-200 py-12 sm:py-16 dark:border-neutral-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Learning path</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">{course.title}</h1>
          {course.description && <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">{course.description}</p>}
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">{course.modules.length} modules</span>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">{lessonCount} lessons</span>
          </div>
        </section>

        <section aria-labelledby="course-outline" className="py-10 sm:py-14">
          <div className="mb-8">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Course outline</p>
            <h2 id="course-outline" className="mt-1 text-2xl font-semibold tracking-tight">Choose where to begin</h2>
          </div>

          <div className="space-y-8">
            {course.modules.map((module) => (
              <section key={module.id} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
                <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Module {module.order}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{module.title}</h3>
                    {module.description && <p className="mt-2 max-w-2xl leading-7 text-neutral-600 dark:text-neutral-300">{module.description}</p>}
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{module.lessons.length} lessons</span>
                </header>

                <ol className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id} className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
                      <Link
                        href={`/courses/${course.id}/lessons/${lesson.id}`}
                        className="group flex min-h-20 items-start gap-4 p-4 transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-neutral-950 dark:hover:bg-neutral-800/70 dark:focus-visible:outline-white sm:p-5"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{lesson.order}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold group-hover:underline group-hover:underline-offset-4">{lesson.title}</span>
                          {lesson.description && <span className="mt-1 block text-sm leading-6 text-neutral-600 dark:text-neutral-300">{lesson.description}</span>}
                          {lesson.concepts.length > 0 && (
                            <span className="mt-3 flex flex-wrap gap-2">
                              {lesson.concepts.map((concept) => (
                                <span key={concept} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{concept}</span>
                              ))}
                            </span>
                          )}
                        </span>
                        <span aria-hidden="true" className="pt-1 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-950 motion-reduce:transform-none dark:group-hover:text-white">→</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
