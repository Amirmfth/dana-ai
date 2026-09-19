import { z } from "zod";

export const lessonPlanSchema = z.object({
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  concepts: z.array(z.string()),
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

export type CoursePlan = z.infer<typeof coursePlanSchema>;
