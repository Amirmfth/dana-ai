import { notFound, redirect } from "next/navigation";

import { CourseGenerationProgress } from "@/components/generation/course-generation-progress";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export default async function CourseGeneratingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireUser();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    select: { id: true, status: true },
  });

  if (!course) notFound();
  if (course.status !== "DRAFT") redirect("/courses/" + courseId);

  return (
    <main className="min-h-dvh bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <CourseGenerationProgress courseId={courseId} />
      </div>
    </main>
  );
}
