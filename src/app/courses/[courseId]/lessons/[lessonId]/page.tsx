import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonContent } from "@/components/lessons/lesson-content";
import { LessonTableOfContents } from "@/components/lessons/lesson-table-of-contents";
import { LessonWorkspace } from "@/components/lessons/lesson-workspace";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { prisma } from "@/lib/db/prisma";
import { getOrGenerateLesson } from "@/lib/lessons/get-or-generate-lesson";

type LessonPageProps = {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;

  const lessonInfo = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { courseId } },
    include: { module: true },
  });

  if (!lessonInfo) {
    notFound();
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      lessonId,
    },

    orderBy: {
      updatedAt: "desc",
    },

    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const initialConversation = conversation
    ? {
        id: conversation.id,
        messages: conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
      }
    : undefined;

  const lesson = await getOrGenerateLesson(lessonId);
  const tocSections = lesson.sections.map((section, index) => ({
    id: `lesson-section-${index}`,
    title: section.title || `Section ${index + 1}`,
  }));

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-white text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50"
    >
      <LessonWorkspace lessonId={lessonId} conversation={initialConversation}>
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:max-w-none lg:px-12 lg:pb-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-600 underline-offset-4 transition hover:text-neutral-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:focus-visible:outline-white"
            >
              Back to {lessonInfo.module.title}
            </Link>
            <ThemeToggle />
          </div>

          <header className="mb-10 border-b border-neutral-200 pb-9 sm:mb-12 sm:pb-10 dark:border-neutral-800">
            <div className="mx-auto w-full max-w-2xl lg:translate-x-8">
              <p className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Module {lessonInfo.module.order}{" "}
                <span aria-hidden="true">·</span> Lesson {lessonInfo.order}
              </p>

              <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white sm:text-4xl">
                {lesson.title}
              </h1>

              {lessonInfo.description && (
                <p className="mt-5 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
                  {lessonInfo.description}
                </p>
              )}
            </div>
          </header>
        </div>

        <div className="px-5 pb-24 sm:px-8 lg:grid lg:grid-cols-[2rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-12 lg:pb-12">
          <LessonTableOfContents sections={tocSections} />

          <div className="min-w-0">
            <div className="mx-auto w-full max-w-2xl">
              <LessonContent lesson={lesson} />
            </div>
          </div>
        </div>
      </LessonWorkspace>
    </main>
  );
}
