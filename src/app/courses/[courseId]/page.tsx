import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseContinueCard } from "@/components/courses/course-continue-card";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { MobileCourseAction } from "@/components/courses/mobile-course-action";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export default async function CoursePage({
  params,
}: PageProps<"/courses/[courseId]">) {
  const user = await requireUser();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!course) notFound();

  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ lesson, module })),
  );
  const lessonCount = lessons.length;
  const completedCount = lessons.filter(
    ({ lesson }) => lesson.status === "COMPLETED",
  ).length;
  const activeEntry =
    lessons.find(({ lesson }) => lesson.status === "IN_PROGRESS") ??
    (completedCount > 0
      ? lessons.find(({ lesson }) => lesson.status === "AVAILABLE")
      : undefined);
  const nextEntry =
    activeEntry ??
    lessons.find(({ lesson }) => lesson.status !== "LOCKED") ??
    lessons[0];
  const hasProgress = completedCount > 0 || Boolean(activeEntry);
  const nextLessonHref =
    nextEntry && nextEntry.lesson.status !== "LOCKED"
      ? "/courses/" + course.id + "/lessons/" + nextEntry.lesson.id
      : undefined;

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
    })),
  }));

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          Courses
        </Link>
        <ThemeToggle compact />
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10">
        <section className="grid gap-8 border-b border-neutral-200 py-12 dark:border-neutral-800 lg:grid-cols-[minmax(0,1.25fr)_minmax(21rem,0.75fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Learning path
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {course.title}
            </h1>
            {course.description && (
              <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
                {course.description}
              </p>
            )}
          </div>
          <CourseContinueCard
            actionHref={nextLessonHref}
            completedCount={completedCount}
            hasProgress={hasProgress}
            lessonCount={lessonCount}
            lessonTitle={nextEntry?.lesson.title}
            moduleOrder={nextEntry?.module.order}
            moduleTitle={nextEntry?.module.title}
          />
        </section>

        <CourseCurriculum courseId={course.id} modules={curriculumModules} />

        <section className="border-t border-neutral-200 py-10 dark:border-neutral-800">
          <h2 className="text-2xl font-semibold">Your learning goal</h2>
          <p className="mt-4 max-w-2xl leading-7 text-neutral-600 dark:text-neutral-300">
            {course.goal}
          </p>
        </section>
      </div>

      {nextEntry && nextLessonHref && (
        <MobileCourseAction
          actionHref={nextLessonHref}
          actionLabel={hasProgress ? "Continue" : "Start"}
          lessonTitle={nextEntry.lesson.title}
          sourceId="course-primary-action"
        />
      )}
    </main>
  );
}
