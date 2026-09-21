import { z } from "zod";

export const sourceExtractionSchema = z.object({
  chunks: z
    .array(
      z.object({
        content: z.string().min(1).max(5000),
        pageStart: z.number().int().positive().nullable(),
        pageEnd: z.number().int().positive().nullable(),
        heading: z.string().max(500).nullable(),
      }),
    )
    .min(1)
    .max(80),
});

export type SourceExtraction = z.infer<typeof sourceExtractionSchema>;
