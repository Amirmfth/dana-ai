import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import {
  coursePlanSchema,
  modulePlanSchema,
  type CoursePlan,
} from "@/lib/ai/schemas/course";

export async function regenerateCoursePlan(
  userId: string,
  currentStructure: unknown,
): Promise<CoursePlan> {
  const response = await createTrackedResponse({
    userId,
    operation: "COURSE_GENERATION",
    model: "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content:
          "You are revising an existing course curriculum. Preserve the learner's overall goal and improve structure, sequencing, lesson coverage, objectives, and concepts. Return a complete replacement proposal. Do not generate lesson prose or quizzes.",
      },
      {
        role: "user",
        content:
          "Current curriculum:\n\n" +
          JSON.stringify(currentStructure, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(coursePlanSchema, "course_plan"),
    },
  });

  return coursePlanSchema.parse(JSON.parse(response.output_text));
}

export async function regenerateModulePlan(
  userId: string,
  currentModule: unknown,
  courseContext: unknown,
) {
  const response = await createTrackedResponse({
    userId,
    operation: "COURSE_GENERATION",
    model: "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content:
          "You are revising one module inside an existing course. Improve the module objective, lesson sequence, lesson descriptions, objectives, and concepts while keeping it aligned with the course. Return only the revised module.",
      },
      {
        role: "user",
        content:
          "Course context:\n\n" +
          JSON.stringify(courseContext, null, 2) +
          "\n\nCurrent module:\n\n" +
          JSON.stringify(currentModule, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(modulePlanSchema, "module_plan"),
    },
  });

  return modulePlanSchema.parse(JSON.parse(response.output_text));
}
