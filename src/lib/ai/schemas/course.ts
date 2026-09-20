import { z } from "zod";

export const courseLevelSchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]);

export const learningStyleSchema = z.enum([
  "BALANCED",
  "PRACTICAL",
  "CONCEPTUAL",
  "PROJECT_BASED",
]);

export const lessonDifficultySchema = z.enum([
  "INTRODUCTORY",
  "EASY",
  "MEDIUM",
  "HARD",
  "ADVANCED",
]);

export const lessonPlanSchema = z.object({
  key: z.string().min(1),
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  concepts: z.array(z.string()),
  difficulty: lessonDifficultySchema.default("MEDIUM"),
  isOptional: z.boolean().default(false),
  prerequisiteKeys: z.array(z.string()).default([]),
});

export const modulePlanSchema = z.object({
  title: z.string(),
  description: z.string(),
  objective: z.string(),
  lessons: z.array(lessonPlanSchema),
});

export const coursePlanSchema = z.object({
  title: z.string(),
  description: z.string(),
  goal: z.string(),
  modules: z.array(modulePlanSchema),
});

export const courseOnboardingSchema = z.object({
  prompt: z.string().trim().min(10).max(8000),
  currentLevel: courseLevelSchema,
  targetLevel: courseLevelSchema,
  weeklyStudyMinutes: z.number().int().min(30).max(2400),
  learningStyle: learningStyleSchema,
});

export type CoursePlan = z.infer<typeof coursePlanSchema>;
export type CourseOnboarding = z.infer<typeof courseOnboardingSchema>;
