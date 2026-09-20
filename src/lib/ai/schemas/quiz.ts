import { z } from "zod";

const commonExerciseFields = {
  question: z.string(),

  explanation: z.string(),

  concepts: z.array(z.string()).min(1),
};

const multipleChoiceSchema = z.object({
  type: z.literal("MULTIPLE_CHOICE"),

  ...commonExerciseFields,

  options: z.array(z.string()).length(4),

  correctAnswer: z.string(),
});

const trueFalseSchema = z.object({
  type: z.literal("TRUE_FALSE"),

  ...commonExerciseFields,

  correctAnswer: z.boolean(),
});

const multipleSelectSchema = z.object({
  type: z.literal("MULTIPLE_SELECT"),

  ...commonExerciseFields,

  options: z
    .array(z.string())
    .min(4)
    .max(6),

  correctAnswers: z
    .array(z.string())
    .min(1),
});

const matchingSchema = z.object({
  type: z.literal("MATCHING"),

  ...commonExerciseFields,

  pairs: z
    .array(
      z.object({
        left: z.string(),
        right: z.string(),
      }),
    )
    .min(3)
    .max(6),
});

const orderingSchema = z.object({
  type: z.literal("ORDERING"),

  ...commonExerciseFields,

  /*
   * Items must be returned in their CORRECT order.
   * We shuffle them before storing the exercise.
   */
  items: z
    .array(z.string())
    .min(3)
    .max(6),
});

export const quizExerciseSchema =
  z.discriminatedUnion("type", [
    multipleChoiceSchema,
    trueFalseSchema,
    multipleSelectSchema,
    matchingSchema,
    orderingSchema,
  ]);

export const lessonQuizSchema = z.object({
  exercises: z
    .array(quizExerciseSchema)
    .min(5)
    .max(8),
});

export type GeneratedQuizExercise =
  z.infer<typeof quizExerciseSchema>;

export type LessonQuiz = z.infer<
  typeof lessonQuizSchema
>;