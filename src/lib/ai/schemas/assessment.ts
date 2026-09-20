import { z } from "zod";

export const generatedAssessmentQuestionSchema = z.object({
  targetLessonId: z.string(),
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
  explanation: z.string().min(1),
  concepts: z.array(z.string()).min(1),
});

export const generatedAssessmentSchema = z.object({
  questions: z.array(generatedAssessmentQuestionSchema).min(3).max(24),
});

export type GeneratedAssessment = z.infer<
  typeof generatedAssessmentSchema
>;
