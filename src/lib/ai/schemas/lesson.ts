import { z } from "zod";

const textBlockSchema = z.object({
  type: z.literal("text"),
  title: z.string().nullable(),
  content: z.string(),
});

const exampleBlockSchema = z.object({
  type: z.literal("example"),
  title: z.string().nullable(),
  example: z.string(),
  explanation: z.string(),
});

const noteBlockSchema = z.object({
  type: z.literal("note"),
  title: z.string().nullable(),
  content: z.string(),
});

const listBlockSchema = z.object({
  type: z.literal("list"),
  title: z.string().nullable(),
  items: z.array(z.string()),
});

export const lessonContentSchema = z.object({
  title: z.string(),

  introduction: z.string(),

  sections: z.array(
    z.discriminatedUnion("type", [
      textBlockSchema,
      exampleBlockSchema,
      noteBlockSchema,
      listBlockSchema,
    ]),
  ),

  keyTakeaways: z.array(z.string()),

  summary: z.string(),

  citations: z
    .array(
      z.object({
        sourceChunkId: z.string(),
        location: z.string(),
      }),
    )
    .default([]),

  /*
   * Compact AI-facing representation of the lesson.
   *
   * This is deliberately separate from the human-facing content.
   * Other AI systems can use this without reading the entire lesson.
   */
  tutorContext: z.object({
    keyConcepts: z.array(z.string()),

    definitions: z.array(
      z.object({
        term: z.string(),
        definition: z.string(),
      }),
    ),

    examplesCovered: z.array(z.string()),

    commonMistakes: z.array(z.string()),

    assumedKnowledge: z.array(z.string()),
  }),
});

export type GeneratedLessonContent = z.infer<
  typeof lessonContentSchema
>;