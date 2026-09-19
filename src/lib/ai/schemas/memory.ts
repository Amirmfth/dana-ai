import { z } from "zod";

export const memoryExtractionSchema = z.object({
  memories: z.array(
    z.object({
      type: z.enum([
        "MISCONCEPTION",
        "WEAKNESS",
        "STRENGTH",
        "PREFERENCE",
        "LEARNING_NOTE",
      ]),

      content: z.string(),

      importance: z.number().int().min(1).max(5),
    }),
  ),
});

export type MemoryExtraction = z.infer<
  typeof memoryExtractionSchema
>;