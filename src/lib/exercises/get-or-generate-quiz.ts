import { Prisma } from "@/generated/prisma/client";

import {
  type GeneratedQuizExercise,
} from "@/lib/ai/schemas/quiz";
import { generateLessonQuiz } from "@/lib/ai/quiz-generator";
import { prisma } from "@/lib/db/prisma";

export async function getOrGenerateQuiz(
  lessonId: string,
) {
  const existing = await prisma.exercise.findMany({
    where: {
      lessonId,
    },

    orderBy: {
      order: "asc",
    },

    include: {
      attempts: {
        orderBy: {
          createdAt: "desc",
        },

        take: 1,
      },
    },
  });

  if (existing.length > 0) {
    return existing;
  }

  const quiz =
    await generateLessonQuiz(lessonId);

  await prisma.exercise.createMany({
    data: quiz.exercises.map(
      (exercise, index) => {
        const storage =
          prepareExercise(exercise);

        return {
          lessonId,

          type: exercise.type,

          order: index + 1,

          question: exercise.question,

          data:
            storage.data as Prisma.InputJsonValue,

          answerKey:
            storage.answerKey as Prisma.InputJsonValue,

          explanation:
            exercise.explanation,

          concepts:
            exercise.concepts,
        };
      },
    ),
  });

  return prisma.exercise.findMany({
    where: {
      lessonId,
    },

    orderBy: {
      order: "asc",
    },

    include: {
      attempts: {
        orderBy: {
          createdAt: "desc",
        },

        take: 1,
      },
    },
  });
}

function prepareExercise(
  exercise: GeneratedQuizExercise,
) {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return {
        data: {
          options: exercise.options,
        },

        answerKey: {
          value: exercise.correctAnswer,
        },
      };

    case "TRUE_FALSE":
      return {
        data: {},

        answerKey: {
          value: exercise.correctAnswer,
        },
      };

    case "MULTIPLE_SELECT":
      return {
        data: {
          options: exercise.options,
        },

        answerKey: {
          values: exercise.correctAnswers,
        },
      };

    case "MATCHING": {
      const pairs = exercise.pairs.map(
        (pair, index) => ({
          left: {
            id: `left-${index + 1}`,
            label: pair.left,
          },

          right: {
            id: `right-${index + 1}`,
            label: pair.right,
          },
        }),
      );

      return {
        data: {
          leftItems: pairs.map(
            (pair) => pair.left,
          ),

          /*
           * Don't expose correct matching by keeping
           * both arrays in identical order.
           */
          rightItems: rotate(
            pairs.map((pair) => pair.right),
          ),
        },

        answerKey: {
          pairs: pairs.map((pair) => ({
            leftId: pair.left.id,
            rightId: pair.right.id,
          })),
        },
      };
    }

    case "ORDERING": {
      const correctItems =
        exercise.items.map(
          (label, index) => ({
            id: `item-${index + 1}`,
            label,
          }),
        );

      return {
        data: {
          /*
           * Stored presentation order is shuffled.
           */
          items: rotate(correctItems),
        },

        answerKey: {
          order: correctItems.map(
            (item) => item.id,
          ),
        },
      };
    }
  }
}

/*
 * Deterministic simple shuffle.
 *
 * We only need to ensure the displayed order isn't
 * automatically the answer order.
 */
function rotate<T>(items: T[]) {
  if (items.length <= 1) {
    return items;
  }

  return [
    ...items.slice(1),
    items[0],
  ];
}