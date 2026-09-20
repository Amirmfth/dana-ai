import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import { CoursePlan, coursePlanSchema } from "./schemas/course";

export async function generateCoursePlan(userId: string, userPrompt: string): Promise<{
  plan: CoursePlan;
  providerResponseId: string;
}> {
  const response = await createTrackedResponse({
    userId,
    operation: "COURSE_GENERATION",
    model: "gpt-5.6-terra",

    reasoning: {
      effort: "medium",
    },

    input: [
      {
        role: "system",
        content: `
You are the curriculum architect for an AI-powered learning application.

Your job is to design a complete, coherent curriculum from the learner's request.

The curriculum will later be used by another AI system to generate each lesson individually.

Therefore, do NOT write the actual lesson content.

Instead, create a detailed roadmap that gives future lesson-generation systems enough information to understand:

- what the overall course is trying to accomplish
- what each module is responsible for
- what each lesson should teach
- what concepts belong to each lesson
- what knowledge should logically come before later material

CURRICULUM RULES

1. The curriculum must have a clear progression.
2. Lessons should build on previous lessons.
3. Avoid unnecessary repetition.
4. Break large subjects into manageable lessons.
5. Each lesson must have specific learning objectives.
6. Each lesson must list the important concepts it introduces or reinforces.
7. The curriculum should be comprehensive enough to realistically achieve the learner's stated goal.
8. Do not artificially limit the number of modules or lessons just to make the output shorter.
9. Do not generate exercises, quizzes, explanations, examples, or lesson prose yet.
10. Lesson titles and descriptions should make their role in the curriculum unambiguous.

The resulting curriculum is the persistent roadmap for the course.
        `.trim(),
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],

    text: {
      format: zodTextFormat(coursePlanSchema, "course_plan"),
    },
  });

  return {
    plan: coursePlanSchema.parse(JSON.parse(response.output_text)),
    providerResponseId: response.id,
  };
}
