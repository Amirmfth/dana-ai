import { z } from "zod";

const singleValueKeySchema = z.object({
  value: z.string(),
});

const booleanKeySchema = z.object({
  value: z.boolean(),
});

const multipleValuesKeySchema = z.object({
  values: z.array(z.string()),
});

const matchingKeySchema = z.object({
  pairs: z.array(
    z.object({
      leftId: z.string(),
      rightId: z.string(),
    }),
  ),
});

const orderingKeySchema = z.object({
  order: z.array(z.string()),
});

const matchingAnswerSchema = z.array(
  z.object({
    leftId: z.string(),
    rightId: z.string(),
  }),
);

export function gradeExercise({
  type,
  answerKey,
  answer,
}: {
  type:
    | "MULTIPLE_CHOICE"
    | "TRUE_FALSE"
    | "MULTIPLE_SELECT"
    | "MATCHING"
    | "ORDERING";

  answerKey: unknown;
  answer: unknown;
}) {
  switch (type) {
    case "MULTIPLE_CHOICE": {
      const key =
        singleValueKeySchema.parse(
          answerKey,
        );

      return (
        typeof answer === "string" &&
        answer === key.value
      );
    }

    case "TRUE_FALSE": {
      const key =
        booleanKeySchema.parse(answerKey);

      return (
        typeof answer === "boolean" &&
        answer === key.value
      );
    }

    case "MULTIPLE_SELECT": {
      const key =
        multipleValuesKeySchema.parse(
          answerKey,
        );

      if (
        !Array.isArray(answer) ||
        !answer.every(
          (value) =>
            typeof value === "string",
        )
      ) {
        return false;
      }

      return sameStringSet(
        answer,
        key.values,
      );
    }

    case "MATCHING": {
      const key =
        matchingKeySchema.parse(answerKey);

      const submitted =
        matchingAnswerSchema.safeParse(
          answer,
        );

      if (!submitted.success) {
        return false;
      }

      if (
        submitted.data.length !==
        key.pairs.length
      ) {
        return false;
      }

      const expected = new Map(
        key.pairs.map((pair) => [
          pair.leftId,
          pair.rightId,
        ]),
      );

      return submitted.data.every(
        (pair) =>
          expected.get(pair.leftId) ===
          pair.rightId,
      );
    }

    case "ORDERING": {
      const key =
        orderingKeySchema.parse(
          answerKey,
        );

      if (
        !Array.isArray(answer) ||
        !answer.every(
          (value) =>
            typeof value === "string",
        )
      ) {
        return false;
      }

      if (
        answer.length !==
        key.order.length
      ) {
        return false;
      }

      return answer.every(
        (value, index) =>
          value === key.order[index],
      );
    }
  }
}

function sameStringSet(
  left: string[],
  right: string[],
) {
  const leftUnique = [
    ...new Set(left),
  ].sort();

  const rightUnique = [
    ...new Set(right),
  ].sort();

  if (
    leftUnique.length !==
    rightUnique.length
  ) {
    return false;
  }

  return leftUnique.every(
    (value, index) =>
      value === rightUnique[index],
  );
}