import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import {
  type CourseOnboarding,
  type CoursePlan,
  coursePlanSchema,
} from "./schemas/course";

export async function generateCoursePlan(
  userId: string,
  onboarding: CourseOnboarding,
): Promise<{
  plan: CoursePlan;
  providerResponseId: string;
}> {
  const response = await createTrackedResponse({
    userId,
    operation: "COURSE_GENERATION",
    model: "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: `
You are the curriculum architect for an AI-powered learning application.

Design a complete coherent curriculum. Do not write lesson prose or quizzes.

Each lesson may include:
- a stable short key unique within this generated plan
- difficulty: INTRODUCTORY, EASY, MEDIUM, HARD, or ADVANCED
- isOptional when the material can safely be skipped
- prerequisiteKeys containing keys of lessons that must come first

PREREQUISITE RULES
1. Create an acyclic prerequisite graph.
2. Only reference earlier lessons.
3. Use explicit prerequisites rather than assuming every lesson depends on the immediately previous lesson.
4. Foundational lessons may have no prerequisites.
5. Optional lessons should not be required by essential lessons unless genuinely necessary.

Adapt course depth, pacing, examples, and scope to the learner profile.
      `.trim(),
      },
      {
        role: "user",
        content:
          "LEARNER REQUEST\n\n" +
          JSON.stringify(onboarding, null, 2),
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
