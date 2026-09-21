import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseTutor } from "@/components/tutor/course-tutor";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export default async function CourseTutorPage({
  params,
}: PageProps<"/courses/[courseId]/tutor">) {
  const user = await requireUser();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    select: {
      id: true,
      title: true,
      goal: true,
    },
  });
  if (!course) notFound();

  const conversation = await prisma.conversation.findFirst({
    where: {
      courseId,
      scope: "COURSE",
      lessonId: null,
      course: { ownerId: user.id },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link
          href={"/courses/" + courseId}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to course
        </Link>
        <header className="mt-5 mb-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Course-wide tutor
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ask Dana about {course.title}
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-300">
            {course.goal}
          </p>
        </header>

        <CourseTutor
          courseId={courseId}
          initialConversationId={conversation?.id}
          initialMessages={
            conversation?.messages.map((message) => ({
              id: message.id,
              role:
                message.role === "USER"
                  ? ("user" as const)
                  : ("assistant" as const),
              content: message.content,
            })) ?? []
          }
        />
      </div>
    </main>
  );
}
