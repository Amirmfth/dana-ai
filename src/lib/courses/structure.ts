import { z } from "zod";

export const courseStructureSchema = z.object({
  version: z.literal(1),
  course: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    goal: z.string().trim().min(1).max(4000),
    instructions: z.string().trim().max(8000).nullable(),
    modules: z.array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).nullable(),
        objective: z.string().trim().max(2000).nullable(),
        lessons: z.array(
          z.object({
            title: z.string().trim().min(1).max(200),
            description: z.string().trim().max(2000).nullable(),
            objectives: z.array(z.string().trim().min(1).max(500)).max(30),
            concepts: z.array(z.string().trim().min(1).max(200)).max(50),
          }),
        ).max(200),
      }),
    ).max(100),
  }),
});

export type CourseStructure = z.infer<typeof courseStructureSchema>;

export function parseLineList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseNullableText(
  value: FormDataEntryValue | null,
  maxLength: number,
) {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error("Text is too long.");
  }

  return normalized;
}
