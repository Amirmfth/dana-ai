"use client";

import { useMemo, useState } from "react";

import { ExerciseQuestion } from "@/components/exercises/exercise-question";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { CompletionFeedback } from "@/components/ui/completion-feedback";

type ExerciseType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "MATCHING"
  | "ORDERING";

type ExerciseAttempt = {
  id: string;
  answer: unknown;
  result?: "CORRECT" | "INCORRECT";
  createdAt: string;
  answerKey?: unknown;
};

export type LessonQuizExercise = {
  id: string;
  type: ExerciseType;
  question: string;
  data: unknown;
  explanation: string;
  order: number;
  attempts: ExerciseAttempt[];
};

type QuizResultItem = {
  exerciseId: string;
  answer: unknown;
  correct: boolean;
  answerKey: unknown;
  explanation: string;
};

type QuizResult = {
  score: number;
  total: number;
  results: Record<string, QuizResultItem>;
};

type LessonQuizProps = {
  lessonId: string;
  quizRunId: string;
  exercises: LessonQuizExercise[];
  initialCompleted?: boolean;
  initialScore?: number | null;
  initialTotal?: number | null;
};

export function LessonQuiz({
  exercises,
  lessonId,
  quizRunId,
  initialCompleted = false,
  initialScore = null,
  initialTotal = null,
}: LessonQuizProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};

    for (const exercise of exercises) {
      const attempt = exercise.attempts[0];
      if (attempt) {
        initial[exercise.id] = attempt.answer;
        continue;
      }

      const orderingDefault = getOrderingDefault(exercise);
      if (orderingDefault) initial[exercise.id] = orderingDefault;
    }

    return initial;
  });

  const [currentQuizRunId, setCurrentQuizRunId] = useState(quizRunId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(() => {
    if (!initialCompleted) return null;

    const items: Record<string, QuizResultItem> = {};
    for (const exercise of exercises) {
      const attempt = exercise.attempts[0];
      if (!attempt?.result || attempt.answerKey === undefined) continue;

      items[exercise.id] = {
        exerciseId: exercise.id,
        answer: attempt.answer,
        correct: attempt.result === "CORRECT",
        answerKey: attempt.answerKey,
        explanation: exercise.explanation,
      };
    }

    return {
      score:
        initialScore ??
        Object.values(items).filter((item) => item.correct).length,
      total: initialTotal ?? exercises.length,
      results: items,
    };
  });

  const answeredCount = exercises.filter((exercise) =>
    hasAnswer(exercise, answers[exercise.id]),
  ).length;
  const unanswered = exercises.filter(
    (exercise) => !hasAnswer(exercise, answers[exercise.id]),
  );
  const current = exercises[currentIndex];

  const progressValue =
    exercises.length > 0
      ? ((result ? currentIndex + 1 : answeredCount) / exercises.length) * 100
      : 0;

  async function submitQuiz() {
    if (unanswered.length > 0 || submitting || result) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/exercises/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizRunId: currentQuizRunId,
          answers: exercises.map((exercise) => ({
            exerciseId: exercise.id,
            answer: answers[exercise.id],
          })),
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        score?: number;
        total?: number;
        results?: QuizResultItem[];
      };

      if (!response.ok || body.score === undefined || body.total === undefined) {
        throw new Error(body.error || "Failed to submit quiz.");
      }

      const results = Object.fromEntries(
        (body.results ?? []).map((item) => [item.exerciseId, item]),
      );

      setResult({
        score: body.score,
        total: body.total,
        results,
      });
      setReviewing(false);
      setCurrentIndex(0);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit quiz.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resetQuiz() {
    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch("/api/exercises/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      const body = (await response.json()) as {
        error?: string;
        quizRunId?: string;
      };

      if (!response.ok || !body.quizRunId) {
        throw new Error(body.error || "Failed to reset quiz.");
      }

      const nextAnswers: Record<string, unknown> = {};
      for (const exercise of exercises) {
        const orderingDefault = getOrderingDefault(exercise);
        if (orderingDefault) nextAnswers[exercise.id] = orderingDefault;
      }

      setCurrentQuizRunId(body.quizRunId);
      setAnswers(nextAnswers);
      setResult(null);
      setReviewing(false);
      setCurrentIndex(0);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Failed to reset quiz.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  if (exercises.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
        No quiz questions are available for this lesson.
      </section>
    );
  }

  if (result && current) {
    const item = result.results[current.id];

    return (
      <section aria-label="Quiz results" className="space-y-6">
        <CompletionFeedback
          title="Knowledge check complete"
          description={
            result.score === result.total
              ? "You answered every question correctly."
              : "Review each answer and explanation below."
          }
        >
          <p className="mt-2 text-3xl font-semibold">
            {result.score} / {result.total}
          </p>
        </CompletionFeedback>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <AnimatedProgress
              value={progressValue}
              label={"Review question " + (currentIndex + 1) + " of " + exercises.length}
            />
          </div>
          <button
            type="button"
            onClick={resetQuiz}
            disabled={isResetting}
            className="min-h-10 shrink-0 rounded-xl border border-neutral-300 px-4 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700"
          >
            {isResetting ? "Resetting…" : "Retake"}
          </button>
        </div>

        <article className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Question {currentIndex + 1} of {exercises.length}
          </p>
          <h3 className="mt-2 text-lg font-semibold leading-7">{current.question}</h3>

          <div
            className={
              "mt-5 rounded-xl border p-4 " +
              (item?.correct
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30")
            }
          >
            <p className="font-semibold">
              {item?.correct ? "Correct" : "Incorrect"}
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-neutral-500">Your answer</dt>
                <dd className="mt-1">{formatAnswer(current, item?.answer)}</dd>
              </div>
              {!item?.correct && (
                <div>
                  <dt className="font-medium text-neutral-500">Correct answer</dt>
                  <dd className="mt-1">
                    {formatAnswer(current, answerFromKey(current, item?.answerKey))}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-4 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
              {item?.explanation || current.explanation}
            </p>
          </div>
        </article>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            className="min-h-11 rounded-xl border border-neutral-300 px-5 text-sm font-semibold disabled:opacity-40 dark:border-neutral-700"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentIndex === exercises.length - 1}
            onClick={() =>
              setCurrentIndex((index) =>
                Math.min(exercises.length - 1, index + 1),
              )
            }
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-950"
          >
            Next
          </button>
        </div>
      </section>
    );
  }

  if (reviewing) {
    return (
      <section aria-label="Review quiz answers">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Review
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Review your answers</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              You can still edit any answer. Correctness is shown only after final submission.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-neutral-500">
            {answeredCount}/{exercises.length} answered
          </span>
        </div>

        {unanswered.length > 0 && (
          <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {unanswered.length} unanswered {unanswered.length === 1 ? "question remains" : "questions remain"}.
            Select an unanswered question below before submitting.
          </div>
        )}

        <ol className="mt-6 space-y-2">
          {exercises.map((exercise, index) => {
            const answered = hasAnswer(exercise, answers[exercise.id]);
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(index);
                    setReviewing(false);
                  }}
                  className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 text-left transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-neutral-500">
                      Question {index + 1}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium">
                      {exercise.question}
                    </span>
                  </span>
                  <span
                    className={
                      "shrink-0 text-xs font-semibold " +
                      (answered ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")
                    }
                  >
                    {answered ? "Answered" : "Unanswered"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="min-h-11 rounded-xl border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700"
          >
            Back to questions
          </button>
          <button
            type="button"
            onClick={submitQuiz}
            disabled={unanswered.length > 0 || submitting}
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950"
          >
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        </div>
      </section>
    );
  }

  if (!current) return null;

  const currentAnswered = hasAnswer(current, answers[current.id]);
  const isLast = currentIndex === exercises.length - 1;

  return (
    <section aria-label="Lesson quiz">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
          Knowledge check
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Check your understanding
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          Answer each question, then submit the quiz once at the end.
        </p>
      </div>

      <AnimatedProgress
        className="mb-6"
        value={((currentIndex + 1) / exercises.length) * 100}
        label={"Question " + (currentIndex + 1) + " of " + exercises.length}
      />

      <article className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
        <p className="mb-2 text-xs font-medium text-neutral-500">
          Question {currentIndex + 1}
        </p>
        <h3 className="text-base font-semibold leading-7">{current.question}</h3>

        <div className="mt-5">
          <ExerciseQuestion
            type={current.type}
            data={current.data}
            value={answers[current.id]}
            disabled={false}
            onChange={(answer) => {
              setAnswers((existing) => ({
                ...existing,
                [current.id]: answer,
              }));
              setError(null);
            }}
          />
        </div>
      </article>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          className="min-h-11 rounded-xl border border-neutral-300 px-5 text-sm font-semibold disabled:opacity-40 dark:border-neutral-700"
        >
          Previous
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
          >
            Review answers
          </button>
        ) : (
          <button
            type="button"
            disabled={!currentAnswered}
            onClick={() =>
              setCurrentIndex((index) =>
                Math.min(exercises.length - 1, index + 1),
              )
            }
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-950"
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}

function getOrderingDefault(exercise: LessonQuizExercise) {
  if (exercise.type !== "ORDERING") return null;
  if (!exercise.data || typeof exercise.data !== "object" || !("items" in exercise.data)) {
    return null;
  }

  const items = (exercise.data as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;

  const ids = items
    .map((item) =>
      item && typeof item === "object" && "id" in item && typeof item.id === "string"
        ? item.id
        : null,
    )
    .filter((id): id is string => Boolean(id));

  return ids.length === items.length ? ids : null;
}

function hasAnswer(exercise: LessonQuizExercise, answer: unknown) {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return typeof answer === "string" && answer.length > 0;
    case "TRUE_FALSE":
      return typeof answer === "boolean";
    case "MULTIPLE_SELECT":
      return Array.isArray(answer) && answer.length > 0;
    case "MATCHING": {
      if (!Array.isArray(answer) || !exercise.data || typeof exercise.data !== "object" || !("leftItems" in exercise.data)) {
        return false;
      }
      const leftItems = (exercise.data as { leftItems?: unknown }).leftItems;
      return Array.isArray(leftItems) && answer.length === leftItems.length;
    }
    case "ORDERING": {
      if (!Array.isArray(answer) || !exercise.data || typeof exercise.data !== "object" || !("items" in exercise.data)) {
        return false;
      }
      const items = (exercise.data as { items?: unknown }).items;
      return Array.isArray(items) && answer.length === items.length;
    }
  }
}

function answerFromKey(exercise: LessonQuizExercise, answerKey: unknown) {
  if (!answerKey || typeof answerKey !== "object") return answerKey;

  if (exercise.type === "MULTIPLE_CHOICE" || exercise.type === "TRUE_FALSE") {
    return "value" in answerKey ? (answerKey as { value?: unknown }).value : answerKey;
  }
  if (exercise.type === "MULTIPLE_SELECT") {
    return "values" in answerKey ? (answerKey as { values?: unknown }).values : answerKey;
  }
  if (exercise.type === "MATCHING") {
    return "pairs" in answerKey ? (answerKey as { pairs?: unknown }).pairs : answerKey;
  }
  if (exercise.type === "ORDERING") {
    return "order" in answerKey ? (answerKey as { order?: unknown }).order : answerKey;
  }

  return answerKey;
}

function formatAnswer(exercise: LessonQuizExercise, answer: unknown) {
  if (answer === undefined || answer === null) return "No answer";
  if (typeof answer === "boolean") return answer ? "True" : "False";
  if (typeof answer === "string") return answer;

  if (exercise.type === "ORDERING" && Array.isArray(answer)) {
    const items = readItems(exercise.data, "items");
    const byId = new Map(items.map((item) => [item.id, item.label]));
    return answer
      .filter((item): item is string => typeof item === "string")
      .map((id) => byId.get(id) ?? id)
      .join(" → ");
  }

  if (exercise.type === "MATCHING" && Array.isArray(answer)) {
    const left = new Map(readItems(exercise.data, "leftItems").map((item) => [item.id, item.label]));
    const right = new Map(readItems(exercise.data, "rightItems").map((item) => [item.id, item.label]));

    return answer
      .filter(
        (pair): pair is { leftId: string; rightId: string } =>
          Boolean(
            pair &&
              typeof pair === "object" &&
              "leftId" in pair &&
              typeof pair.leftId === "string" &&
              "rightId" in pair &&
              typeof pair.rightId === "string",
          ),
      )
      .map((pair) => (left.get(pair.leftId) ?? pair.leftId) + " → " + (right.get(pair.rightId) ?? pair.rightId))
      .join(", ");
  }

  if (Array.isArray(answer)) {
    return answer.map((item) => String(item)).join(", ");
  }

  return JSON.stringify(answer);
}

function readItems(data: unknown, key: "items" | "leftItems" | "rightItems") {
  if (!data || typeof data !== "object" || !(key in data)) return [];

  const value = (data as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is { id: string; label: string } =>
      Boolean(
        item &&
          typeof item === "object" &&
          "id" in item &&
          typeof item.id === "string" &&
          "label" in item &&
          typeof item.label === "string",
      ),
  );
}
