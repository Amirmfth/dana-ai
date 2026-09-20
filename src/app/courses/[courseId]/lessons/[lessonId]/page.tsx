import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LessonCompletion } from "@/components/lessons/lesson-completion";
import { LessonContent } from "@/components/lessons/lesson-content";
import { LessonTableOfContents } from "@/components/lessons/lesson-table-of-contents";
import { LessonWorkspace } from "@/components/lessons/lesson-workspace";
import { LessonQuiz } from "@/components/exercises/lesson-quiz";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { getOrGenerateLesson } from "@/lib/lessons/get-or-generate-lesson";
import { markLessonStarted } from "@/lib/lessons/progress";
import { getOrGenerateQuiz } from "@/lib/exercises/get-or-generate-quiz";
import { isLessonAccessible } from "@/lib/security/lesson-access";

type LessonPageProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const user = await requireUser();
  const { courseId, lessonId } = await params;

  const lessonInfo = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { courseId, course: { ownerId: user.id } },
    },
    include: { module: true },
  });

  if (!lessonInfo) notFound();

  if (!isLessonAccessible(lessonInfo.status)) {
    redirect("/courses/" + courseId);
  }

  await markLessonStarted(user.id, lessonId);

  const conversation = await prisma.conversation.findFirst({
    where: { lessonId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
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

  const lesson = await getOrGenerateLesson(user.id, lessonId);
  const exercises = await getOrGenerateQuiz(user.id, lessonId);
  const quizExercises = exercises.map((exercise) => {
    const latestAttempt = exercise.attempts[0];

    return {
      id: exercise.id,
      type: exercise.type,
      question: exercise.question,
      data: exercise.data,
      explanation: exercise.explanation,
      order: exercise.order,
      attempts: latestAttempt
        ? [
            {
              id: latestAttempt.id,
              answer: latestAttempt.answer,
              result: latestAttempt.result,
              createdAt: latestAttempt.createdAt.toISOString(),
              answerKey: exercise.answerKey,
            },
          ]
        : [],
    };
  });

  return (
    <main className="min-h-dvh bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <LessonWorkspace lessonId={lessonId} conversation={initialConversation}>
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between">
            <Link
              href={"/courses/" + courseId}
              className="text-sm font-medium underline underline-offset-4"
            >
              Back to course
            </Link>
            <ThemeToggle />
          </div>
          <header className="mx-auto mt-10 max-w-2xl">
            <p className="text-sm text-neutral-500">
              Module {lessonInfo.module.order} · Lesson {lessonInfo.order}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              {lesson.title}
            </h1>
          </header>
        </div>

        <div className="mx-auto max-w-2xl px-5 pb-24 sm:px-8">
          <LessonTableOfContents
            sections={lesson.sections.map((section, index) => ({
              id: "lesson-section-" + index,
              title: section.title || "Section " + (index + 1),
            }))}
          />
          <LessonContent lesson={lesson} />
          <LessonQuiz exercises={quizExercises} lessonId={lessonId} />
          <LessonCompletion
            courseId={courseId}
            lessonId={lessonId}
            isCompleted={lessonInfo.status === "COMPLETED"}
          />
        </div>
      </LessonWorkspace>
    </main>
  );
}
