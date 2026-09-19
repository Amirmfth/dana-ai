import { generateCoursePlan } from "@/lib/ai/course-generator";
import { prisma } from "@/lib/db/prisma";

export async function createCourse(userPrompt: string) {
  const prompt = userPrompt.trim();

  if (prompt.length < 10) {
    throw new Error("Please describe what you want to learn in more detail.");
  }

  const { plan, providerResponseId } = await generateCoursePlan(prompt);

  const course = await prisma.course.create({
    data: {
      title: plan.title,
      description: plan.description,
      goal: plan.goal,
      prompt,
      status: "ACTIVE",

      modules: {
        create: plan.modules.map((module, moduleIndex) => ({
          title: module.title,
          description: module.description,
          objective: module.objective,
          order: moduleIndex + 1,

          lessons: {
            create: module.lessons.map((lesson, lessonIndex) => ({
              title: lesson.title,
              description: lesson.description,
              objectives: lesson.objectives,
              concepts: lesson.concepts,
              order: lessonIndex + 1,

              // We'll implement real unlocking/progress later.
              status:
                moduleIndex === 0 && lessonIndex === 0 ? "AVAILABLE" : "LOCKED",
            })),
          },
        })),
      },
    },

    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  await prisma.aiUsage.updateMany({
    where: { providerResponseId },
    data: { courseId: course.id },
  });

  return course;
}
