import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseContinueCard } from "@/components/courses/course-continue-card";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { MobileCourseAction } from "@/components/courses/mobile-course-action";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export default async function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  const user = await requireUser();
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              prerequisites: {
                select: { prerequisiteLessonId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const lessons = course.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })));
  const lessonCount = lessons.length;
  const completedCount = lessons.filter(({ lesson }) => lesson.status === "COMPLETED").length;
  const activeEntry =
    lessons.find(({ lesson }) => lesson.status === "IN_PROGRESS") ??
    lessons.find(({ lesson }) => lesson.status === "AVAILABLE");
  const nextEntry = activeEntry;
  const hasProgress = completedCount > 0 || Boolean(activeEntry);
  const nextLessonHref = nextEntry ? `/courses/${course.id}/lessons/${nextEntry.lesson.id}` : undefined;
  const curriculumModules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    objective: module.objective,
    order: module.order,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      concepts: lesson.concepts,
      order: lesson.order,
      status: lesson.status,
      difficulty: lesson.difficulty,
      isOptional: lesson.isOptional,
      completionMethod: lesson.completionMethod,
      prerequisiteCount: lesson.prerequisites.length,
    })),
  }));

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-neutral-50/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90 lg:static lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none dark:lg:bg-transparent">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8 lg:h-20 lg:px-10">
          <Link href="/" aria-label="Back to courses" className="flex min-h-11 min-w-11 items-center gap-2 rounded-lg text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white">
            <ArrowLeftIcon />
            <span className="hidden lg:inline">Courses</span>
          </Link>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight lg:hidden">{course.title}</p>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-2 text-sm lg:flex">
            <Link href="/" className="text-neutral-500 transition hover:text-neutral-950 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:focus-visible:outline-white">Courses</Link>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">/</span>
            <span aria-current="page" className="truncate font-medium text-neutral-800 dark:text-neutral-200">{course.title}</span>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={"/courses/" + course.id + "/assessments"}
              className="min-h-10 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              Assessments
            </Link>
            <Link
              href={"/courses/" + course.id + "/placement"}
              className="min-h-10 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              Placement
            </Link>
            <Link
              href={"/courses/" + course.id + "/analytics"}
              className="min-h-10 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              Analytics
            </Link>
            <Link
              href={"/courses/" + course.id + "/manage"}
              className="min-h-10 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              Manage
            </Link>
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10 lg:pb-16">
        {course.status === "ARCHIVED" && (
          <div className="mt-5 rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            This course is archived. You can restore it from Manage.
          </div>
        )}
        <section className="grid gap-8 border-b border-neutral-200 py-8 dark:border-neutral-800 sm:py-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(21rem,0.75fr)] lg:items-center lg:gap-16 lg:py-16">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Learning path</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">{course.title}</h1>
            {course.description && <p className="mt-4 max-w-2xl line-clamp-3 text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">{course.description}</p>}
            <p className="mt-5 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}<span aria-hidden="true"> · </span>{lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
              {course.currentLevel && course.targetLevel && (
                <>
                  <span aria-hidden="true"> · </span>
                  {course.currentLevel.toLowerCase()} → {course.targetLevel.toLowerCase()}
                </>
              )}
            </p>
            {course.description && (
              <details className="group mt-5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md font-semibold text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-200 dark:focus-visible:outline-white [&::-webkit-details-marker]:hidden">
                  More about this course <ChevronIcon />
                </summary>
                <p className="pb-2 leading-7">{course.description}</p>
              </details>
            )}
          </div>

          <CourseContinueCard actionHref={nextLessonHref} completedCount={completedCount} hasProgress={hasProgress} lessonCount={lessonCount} lessonTitle={nextEntry?.lesson.title} moduleOrder={nextEntry?.module.order} moduleTitle={nextEntry?.module.title} />
        </section>

        <nav aria-label="Course sections" className="sticky top-14 z-30 -mx-5 flex gap-6 overflow-x-auto border-b border-neutral-200 bg-neutral-50/95 px-5 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/95 sm:-mx-8 sm:px-8 lg:top-0 lg:mx-0 lg:px-0">
          <a href="#curriculum" className="flex min-h-14 shrink-0 items-center border-b-2 border-neutral-950 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-neutral-950 dark:border-white dark:focus-visible:outline-white">Curriculum</a>
          <a href="#about" className="flex min-h-14 shrink-0 items-center border-b-2 border-transparent text-sm font-medium text-neutral-500 transition hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:focus-visible:outline-white">About</a>
        </nav>

        <CourseCurriculum courseId={course.id} modules={curriculumModules} />

        <section id="about" aria-labelledby="about-heading" className="scroll-mt-32 border-t border-neutral-200 py-10 dark:border-neutral-800 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(12rem,0.35fr)_minmax(0,0.65fr)] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">About</p>
              <h2 id="about-heading" className="mt-2 text-2xl font-semibold tracking-tight">Your learning goal</h2>
            </div>
            <div className="max-w-2xl space-y-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
              <p>{course.goal}</p>
              {course.description && <p>{course.description}</p>}
            </div>
          </div>
        </section>
      </div>

      {nextEntry && nextLessonHref && <MobileCourseAction actionHref={nextLessonHref} actionLabel={hasProgress ? "Continue" : "Start"} lessonTitle={nextEntry.lesson.title} sourceId="course-primary-action" />}
    </main>
  );
}

function ArrowLeftIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5 shrink-0"><path d="m15 18-6-6 6-6M9 12h11" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChevronIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"><path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
