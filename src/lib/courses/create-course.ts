import { generateCoursePlan } from "@/lib/ai/course-generator";
import {
  type CourseOnboarding,
  courseOnboardingSchema,
} from "@/lib/ai/schemas/course";
import { prisma } from "@/lib/db/prisma";
import { normalizeCourseProgress } from "@/lib/courses/management";

export async function createCourse(
  userId: string,
  input: CourseOnboarding,
) {
  const onboarding = courseOnboardingSchema.parse(input);
  const { plan, providerResponseId } = await generateCoursePlan(
    userId,
    onboarding,
  );

  const course = await prisma.course.create({
    data: {
      ownerId: userId,
      title: plan.title,
      description: plan.description,
      goal: plan.goal,
      prompt: onboarding.prompt,
      currentLevel: onboarding.currentLevel,
      targetLevel: onboarding.targetLevel,
      weeklyStudyMinutes: onboarding.weeklyStudyMinutes,
      learningStyle: onboarding.learningStyle,
      status: "ACTIVE",
      modules: {
        create: plan.modules.map((courseModule, moduleIndex) => ({
          title: courseModule.title,
          description: courseModule.description,
          objective: courseModule.objective,
          order: moduleIndex + 1,
          lessons: {
            create: courseModule.lessons.map((lesson, lessonIndex) => ({
              title: lesson.title,
              description: lesson.description,
              objectives: lesson.objectives,
              concepts: lesson.concepts,
              difficulty: lesson.difficulty,
              isOptional: lesson.isOptional,
              order: lessonIndex + 1,
              status: "LOCKED",
            })),
          },
        })),
      },
    },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  const planned = plan.modules.flatMap((courseModule) =>
    courseModule.lessons,
  );
  const created = course.modules.flatMap((courseModule) =>
    courseModule.lessons,
  );
  const keyToLessonId = new Map<string, string>();

  planned.forEach((lesson, index) => {
    const key = lesson.key?.trim() || "lesson-" + (index + 1);
    keyToLessonId.set(key, created[index].id);
  });

  const prerequisiteRows = planned.flatMap((lesson, index) => {
    const lessonId = created[index].id;
    const explicit = lesson.prerequisiteKeys
      .map((key) => keyToLessonId.get(key))
      .filter((id): id is string => Boolean(id) && id !== lessonId);

    if (explicit.length > 0) {
      return [...new Set(explicit)].map((prerequisiteLessonId) => ({
        lessonId,
        prerequisiteLessonId,
      }));
    }

    // Preserve sensible sequential behavior when the AI emits no graph edge.
    if (index > 0) {
      return [{
        lessonId,
        prerequisiteLessonId: created[index - 1].id,
      }];
    }

    return [];
  });

  if (prerequisiteRows.length > 0) {
    await prisma.lessonPrerequisite.createMany({
      data: prerequisiteRows,
      skipDuplicates: true,
    });
  }

  await normalizeCourseProgress(course.id);

  await prisma.aiUsage.updateMany({
    where: { providerResponseId, userId },
    data: { courseId: course.id },
  });

  return course;
}
