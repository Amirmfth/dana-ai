"use client";

import { useState, type ReactNode } from "react";

import { useLessonMobileControls } from "@/components/lessons/lesson-mobile-controls";

export function LessonContentQuizSwitcher({
  content,
  quiz,
}: {
  content: ReactNode;
  quiz?: ReactNode;
}) {
  const [activeView, setActiveView] = useState<"content" | "quiz">("content");
  const { isQuizOpen, setQuizOpen, isFocusMode } = useLessonMobileControls();
  const hasQuiz = Boolean(quiz);

  if (!hasQuiz) return <>{content}</>;

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Lesson view"
        className="lesson-distraction mb-8 hidden border-b border-neutral-200 lg:flex dark:border-neutral-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "content"}
          onClick={() => setActiveView("content")}
          className={
            "min-h-12 border-b-2 px-4 text-sm font-semibold transition " +
            (activeView === "content"
              ? "border-neutral-950 text-neutral-950 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-950 dark:hover:text-white")
          }
        >
          Content
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "quiz"}
          onClick={() => setActiveView("quiz")}
          className={
            "min-h-12 border-b-2 px-4 text-sm font-semibold transition " +
            (activeView === "quiz"
              ? "border-neutral-950 text-neutral-950 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-950 dark:hover:text-white")
          }
        >
          Quiz
        </button>
      </div>

      <div className={activeView === "content" || isFocusMode ? "lg:block" : "lg:hidden"}>
        {content}
      </div>

      <div
        id="lesson-quiz-sheet"
        aria-hidden={!isQuizOpen && (activeView !== "quiz" || isFocusMode)}
        className={[
          "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white shadow-2xl transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-950",
          isQuizOpen && !isFocusMode ? "translate-y-0" : "translate-y-full pointer-events-none",
          activeView === "quiz" && !isFocusMode
            ? "lg:static lg:block lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:pointer-events-auto"
            : "lg:hidden",
        ].join(" ")}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Knowledge check
            </p>
            <h2 className="mt-1 font-semibold">Lesson quiz</h2>
          </div>
          <button
            type="button"
            onClick={() => setQuizOpen(false)}
            className="flex size-10 items-center justify-center rounded-full border border-neutral-200 text-xl dark:border-neutral-700"
            aria-label="Close quiz"
          >
            ×
          </button>
        </div>
        <div className="p-5 pb-24 sm:p-6 sm:pb-24 lg:p-0 lg:pb-0">
          {quiz}
        </div>
      </div>

      {isQuizOpen && !isFocusMode && (
        <button
          type="button"
          aria-label="Close quiz"
          onClick={() => setQuizOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
        />
      )}
    </div>
  );
}
