import { prisma } from "@/lib/db/prisma";

export async function markLessonStarted(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

    select: {
      id: true,
      status: true,
      startedAt: true,
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  /*
   * Completed lessons stay completed.
   *
   * LOCKED lessons are not automatically unlocked merely
   * because somebody knows their URL.
   */
  if (lesson.status === "COMPLETED" || lesson.status === "LOCKED") {
    return lesson;
  }

  if (lesson.status === "IN_PROGRESS") {
    return lesson;
  }

  return prisma.lesson.update({
    where: {
      id: lessonId,
    },

    data: {
      status: "IN_PROGRESS",

      startedAt: lesson.startedAt ?? new Date(),
    },
  });
}

export async function completeLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

    include: {
      module: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: {
                  order: "asc",
                },

                include: {
                  lessons: {
                    orderBy: {
                      order: "asc",
                    },

                    select: {
                      id: true,
                      status: true,
                      order: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const course = lesson.module.course;

  /*
   * Flatten the curriculum in its real sequential order.
   */
  const orderedLessons = course.modules.flatMap((module) => module.lessons);

  const currentIndex = orderedLessons.findIndex(
    (item) => item.id === lesson.id,
  );

  if (currentIndex === -1) {
    throw new Error("Lesson is not part of its course curriculum.");
  }

  const nextLesson = orderedLessons[currentIndex + 1] ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: {
        id: lesson.id,
      },

      data: {
        status: "COMPLETED",
        completedAt: lesson.completedAt ?? new Date(),

        /*
         * Handles old lessons which may have been
         * completed without ever receiving startedAt.
         */
        startedAt: lesson.startedAt ?? new Date(),
      },
    });

    if (nextLesson && nextLesson.status === "LOCKED") {
      await tx.lesson.update({
        where: {
          id: nextLesson.id,
        },

        data: {
          status: "AVAILABLE",
        },
      });
    }

    /*
     * Completing the last curriculum lesson completes
     * the whole course.
     */
    if (!nextLesson) {
      await tx.course.update({
        where: {
          id: course.id,
        },

        data: {
          status: "COMPLETED",
        },
      });
    }
  });

  return {
    courseId: course.id,
    nextLessonId: nextLesson?.id ?? null,
  };
}
