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

export const lessonDiagramSchema = z.object({
  type: z.literal("diagram"),
  title: z.string().nullable(),
  diagramType: z.enum([
    "FLOW",
    "SEQUENCE",
    "HIERARCHY",
    "RELATIONSHIP",
    "COMPARISON",
  ]),
  direction: z.enum(["HORIZONTAL", "VERTICAL"]).default("VERTICAL"),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(160),
        detail: z.string().max(300).nullable(),
        group: z.string().max(80).nullable(),
      }),
    )
    .min(2)
    .max(12),
  edges: z
    .array(
      z.object({
        from: z.string().min(1).max(80),
        to: z.string().min(1).max(80),
        label: z.string().max(120).nullable(),
      }),
    )
    .max(20),
  caption: z.string().max(500).nullable(),
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
      lessonDiagramSchema,
    ]),
  ),

  keyTakeaways: z.array(z.string()),

  summary: z.string(),

  citations: z
    .array(
      z.object({
        marker: z.string().regex(/^\[S\d+\]$/),
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