"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  question: string;
  options: string[];
  order: number;
};

export function AssessmentRunner({
  runId,
  questions,
}: {
  runId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
    completed: boolean;
    score: number | null;
    passed: boolean | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];
  if (!current) return null;

  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/assessments/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          questionId: current.id,
          answer: selected,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit answer.");
      }

      const result = await response.json();
      setFeedback(result);
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (feedback?.completed) {
      router.refresh();
      return;
    }

    setIndex((value) => Math.min(value + 1, questions.length - 1));
    setSelected("");
    setFeedback(null);
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Question {index + 1} of {questions.length}
        </p>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            className="h-full bg-neutral-950 dark:bg-white"
            style={{ width: ((index + 1) / questions.length) * 100 + "%" }}
          />
        </div>
      </div>

      <h2 className="mt-5 text-xl font-semibold leading-8">
        {current.question}
      </h2>

      <div className="mt-5 grid gap-3">
        {current.options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer gap-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-700"
          >
            <input
              type="radio"
              name={"assessment-" + current.id}
              value={option}
              checked={selected === option}
              disabled={Boolean(feedback)}
              onChange={() => setSelected(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>

      {feedback && (
        <div className="mt-5 rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-800">
          <p className="font-semibold">
            {feedback.correct ? "Correct" : "Not quite"}
          </p>
          <p className="mt-1 leading-6 text-neutral-600 dark:text-neutral-300">
            {feedback.explanation}
          </p>
          {feedback.completed && (
            <p className="mt-3 font-semibold">
              Score: {feedback.score}% · {feedback.passed ? "Passed" : "Not passed"}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        {!feedback ? (
          <button
            type="button"
            disabled={!selected || submitting}
            onClick={submit}
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-950"
          >
            {submitting ? "Checking…" : "Check answer"}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
          >
            {feedback.completed ? "See result" : "Next question"}
          </button>
        )}
      </div>
    </section>
  );
}
