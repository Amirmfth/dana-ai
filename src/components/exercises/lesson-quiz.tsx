"use client";

import { useState } from "react";
import { ExerciseQuestion } from "./exercise-question";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { CompletionFeedback } from "@/components/ui/completion-feedback";

type ExerciseType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "MATCHING"
  | "ORDERING";

type Exercise = {
  id: string;
  type: ExerciseType;
  question: string;
  data: unknown;
  explanation: string;
  order: number;

  attempts: Array<{
    id: string;
    answer: unknown;
    result: "CORRECT" | "INCORRECT";
    createdAt: string;
    answerKey: unknown;
  }>;
};

type QuestionState = {
  answer?: unknown;
  submitted: boolean;
  correct?: boolean;
  answerKey?: unknown;
  explanation?: string;
};

type LessonQuizProps = {
  lessonId: string;
  quizRunId: string;
  exercises: Exercise[];
};

export function LessonQuiz({
  exercises,
  lessonId,
  quizRunId,
}: LessonQuizProps) {
  const [state, setState] = useState<Record<string, QuestionState>>(() => {
    const initial: Record<string, QuestionState> = {};

    for (const exercise of exercises) {
      const attempt = exercise.attempts[0];

      if (!attempt) {
        continue;
      }

      initial[exercise.id] = {
        answer: attempt.answer,
        submitted: true,
        correct: attempt.result === "CORRECT",
        answerKey: attempt.answerKey,
        explanation: exercise.explanation,
      };
    }

    return initial;
  });

  const [currentQuizRunId, setCurrentQuizRunId] = useState(quizRunId);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);

  async function submitAnswer(exercise: Exercise) {
    const current = state[exercise.id];

    if (!current || current.submitted || !hasAnswer(exercise, current.answer)) {
      return;
    }

    setSubmitting(exercise.id);

    try {
      const response = await fetch("/api/exercises/answer", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          exerciseId: exercise.id,
          quizRunId: currentQuizRunId,
          answer: current.answer,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit answer.");
      }

      const result = (await response.json()) as {
        correct: boolean;
        answerKey: unknown;
        explanation: string;
      };

      setState((currentState) => ({
        ...currentState,

        [exercise.id]: {
          ...currentState[exercise.id],

          submitted: true,

          correct: result.correct,

          answerKey: result.answerKey,

          explanation: result.explanation,
        },
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(null);
    }
  }

  async function resetQuiz() {
    setIsResetting(true);

    try {
      const response = await fetch("/api/exercises/reset", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          lessonId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset quiz.");
      }

      const result = (await response.json()) as { quizRunId: string };
      setCurrentQuizRunId(result.quizRunId);
      setState({});
    } catch (error) {
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  }

  const completed = exercises.filter(
    (exercise) => state[exercise.id]?.submitted,
  ).length;

  const correct = exercises.filter(
    (exercise) => state[exercise.id]?.correct === true,
  ).length;

  return (
    <section className="mt-16 border-t border-neutral-200 pt-12 dark:border-neutral-800">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Knowledge check
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Check your understanding
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            Answer these questions before completing the lesson.
          </p>
        </div>

        <button
          type="button"
          onClick={resetQuiz}
          disabled={isResetting}
          className="h-fit shrink-0 rounded-lg border border-neutral-300 p-3 text-sm font-medium transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {isResetting ? "Resetting…" : "Reset quiz"}
        </button>
      </div>

      {exercises.length > 0 && (
        <AnimatedProgress
          className="mb-8"
          value={(completed / exercises.length) * 100}
          label={completed + " of " + exercises.length + " questions answered"}
        />
      )}

      <div className="space-y-8">
        {exercises.map((exercise) => {
          const questionState = state[exercise.id];

          return (
            <article
              key={exercise.id}
              className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 sm:p-6"
            >
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Question {exercise.order}
                </p>

                <h3 className="text-base font-semibold leading-7">
                  {exercise.question}
                </h3>
              </div>

              <ExerciseQuestion
                type={exercise.type}
                data={exercise.data}
                value={questionState?.answer}
                disabled={questionState?.submitted ?? false}
                onChange={(answer) => {
                  setState((current) => ({
                    ...current,

                    [exercise.id]: {
                      answer,
                      submitted: false,
                    },
                  }));
                }}
              />

              {!questionState?.submitted ? (
                <button
                  type="button"
                  disabled={
                    !hasAnswer(exercise, questionState?.answer) ||
                    submitting === exercise.id
                  }
                  onClick={() => submitAnswer(exercise)}
                  className="mt-5 min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950"
                >
                  {submitting === exercise.id ? "Checking…" : "Check answer"}
                </button>
              ) : (
                <div className="mt-5 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900">
                  <p className="font-semibold">
                    {questionState.correct ? "Correct" : "Not quite"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    {questionState.explanation}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {completed === exercises.length && exercises.length > 0 && (
        <div className="mt-8">
          <CompletionFeedback
            title="Knowledge check complete"
            description={
              correct === exercises.length
                ? "You answered every question correctly."
                : "Review the explanations before completing the lesson."
            }
          >
            <p className="mt-2 text-2xl font-semibold">
              {correct} / {exercises.length}
            </p>
          </CompletionFeedback>
        </div>
      )}
    </section>
  );
}

function hasAnswer(exercise: Exercise, answer: unknown) {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return typeof answer === "string" && answer.length > 0;

    case "TRUE_FALSE":
      return typeof answer === "boolean";

    case "MULTIPLE_SELECT":
      return Array.isArray(answer) && answer.length > 0;

    case "MATCHING": {
      if (!Array.isArray(answer)) {
        return false;
      }

      if (
        !exercise.data ||
        typeof exercise.data !== "object" ||
        !("leftItems" in exercise.data)
      ) {
        return false;
      }

      const leftItems = (
        exercise.data as {
          leftItems?: unknown;
        }
      ).leftItems;

      if (!Array.isArray(leftItems)) {
        return false;
      }

      return answer.length === leftItems.length;
    }

    case "ORDERING": {
      if (!Array.isArray(answer)) {
        return false;
      }

      if (
        !exercise.data ||
        typeof exercise.data !== "object" ||
        !("items" in exercise.data)
      ) {
        return false;
      }

      const items = (
        exercise.data as {
          items?: unknown;
        }
      ).items;

      return Array.isArray(items) && answer.length === items.length;
    }
  }
}
