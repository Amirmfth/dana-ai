import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import {
  generatedAssessmentSchema,
  type GeneratedAssessment,
} from "@/lib/ai/schemas/assessment";

type AssessmentTarget = {
  id: string;
  title: string;
  description: string | null;
  objectives: string[];
  concepts: string[];
  difficulty: string;
};

export async function generatePlacementAssessment(
  userId: string,
  course: {
    id: string;
    title: string;
    goal: string;
    currentLevel: string | null;
    targetLevel: string | null;
  },
  lessons: AssessmentTarget[],
): Promise<GeneratedAssessment> {
  const response = await createTrackedResponse({
    userId,
    operation: "QUIZ_GENERATION",
    model: "gpt-5.6-luna",
    reasoning: { effort: "medium" },
    courseId: course.id,
    input: [
      {
        role: "system",
        content:
          "Create a placement assessment using only objective multiple-choice questions. Test prerequisite knowledge, not trivia. Select up to 10 foundational lessons and create two distinct questions for each selected lesson when possible. Each question must target exactly one supplied lesson ID. Use four options and exactly one correct answer. Do not assume generated lesson prose exists.",
      },
      {
        role: "user",
        content: JSON.stringify({ course, lessons }, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(
        generatedAssessmentSchema,
        "placement_assessment",
      ),
    },
  });

  return generatedAssessmentSchema.parse(
    JSON.parse(response.output_text),
  );
}

export async function generateTestOutAssessment(
  userId: string,
  courseId: string,
  lesson: AssessmentTarget,
): Promise<GeneratedAssessment> {
  const response = await createTrackedResponse({
    userId,
    operation: "QUIZ_GENERATION",
    model: "gpt-5.6-luna",
    reasoning: { effort: "medium" },
    courseId,
    lessonId: lesson.id,
    input: [
      {
        role: "system",
        content:
          "Create a rigorous 5 to 8 question test-out assessment using only objective multiple-choice questions. A passing learner should demonstrate the lesson objectives without studying the generated lesson. Use four options, one correct answer, and target the supplied lesson ID on every question.",
      },
      {
        role: "user",
        content: JSON.stringify(lesson, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(
        generatedAssessmentSchema,
        "test_out_assessment",
      ),
    },
  });

  return generatedAssessmentSchema.parse(
    JSON.parse(response.output_text),
  );
}


export async function generateModuleAssessment(
  userId: string,
  courseId: string,
  module: {
    id: string;
    title: string;
    objective: string | null;
  },
  lessons: AssessmentTarget[],
): Promise<GeneratedAssessment> {
  const response = await createTrackedResponse({
    userId,
    operation: "QUIZ_GENERATION",
    model: "gpt-5.6-luna",
    reasoning: { effort: "medium" },
    courseId,
    input: [
      {
        role: "system",
        content:
          "Create a rigorous 8 to 12 question module-end assessment using only objective multiple-choice questions. Cover the important objectives and concepts across the supplied lessons, emphasize understanding and application over trivia, use four options with exactly one correct answer, and target each question to the most relevant supplied lesson ID.",
      },
      {
        role: "user",
        content: JSON.stringify({ module, lessons }, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(
        generatedAssessmentSchema,
        "module_assessment",
      ),
    },
  });

  return generatedAssessmentSchema.parse(
    JSON.parse(response.output_text),
  );
}

export async function generateCourseFinalAssessment(
  userId: string,
  course: {
    id: string;
    title: string;
    goal: string;
  },
  modules: Array<{
    id: string;
    title: string;
    objective: string | null;
    lessons: AssessmentTarget[];
  }>,
): Promise<GeneratedAssessment> {
  const response = await createTrackedResponse({
    userId,
    operation: "QUIZ_GENERATION",
    model: "gpt-5.6-luna",
    reasoning: { effort: "medium" },
    courseId: course.id,
    input: [
      {
        role: "system",
        content:
          "Create a comprehensive 12 to 20 question course-final assessment using only objective multiple-choice questions. Sample important objectives across modules, emphasize integration and application, avoid minor trivia, use four options with exactly one correct answer, and target every question to the most relevant supplied lesson ID so results can be broken down by module.",
      },
      {
        role: "user",
        content: JSON.stringify({ course, modules }, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(
        generatedAssessmentSchema,
        "course_final_assessment",
      ),
    },
  });

  return generatedAssessmentSchema.parse(
    JSON.parse(response.output_text),
  );
}
