"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

type Job = {
  kind: "LESSON_CONTENT" | "LESSON_QUIZ";
  status: "NOT_STARTED" | "GENERATING" | "READY" | "FAILED";
  stage: string | null;
  errorMessage: string | null;
};

type Payload = {
  mode?: "GUIDED" | "FLEXIBLE";
  content: Job | null;
  quiz: Job | null;
};

const stages = [
  { key: "PREPARING_CONTEXT", label: "Preparing lesson context" },
  { key: "GENERATING_CONTENT", label: "Generating lesson content" },
  { key: "SAVING_CONTENT", label: "Saving lesson and citations" },
  { key: "PREPARING_QUIZ", label: "Preparing the knowledge check" },
  { key: "GENERATING_QUIZ", label: "Generating the knowledge check" },
  { key: "SAVING_QUIZ", label: "Saving quiz questions" },
  { key: "READY", label: "Lesson ready" },
];

export function LessonGenerationProgress() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;
  const [payload, setPayload] = useState<Payload>({ content: null, quiz: null });

  useEffect(() => {
    if (!lessonId) return;

    let active = true;

    async function load() {
      const response = await fetch("/api/generation/lesson/" + lessonId, {
        cache: "no-store",
      });
      if (!response.ok || !active) return;
      const next = (await response.json()) as Payload;
      if (active) setPayload(next);
    }

    void load();
    const timer = window.setInterval(() => void load(), 650);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [lessonId]);

  const failed = payload.content?.status === "FAILED"
    ? payload.content
    : payload.quiz?.status === "FAILED"
      ? payload.quiz
      : null;

  const stage = useMemo(() => {
    if (payload.mode === "FLEXIBLE" && payload.content?.status === "READY") return "READY";
    if (payload.quiz?.status === "READY") return "READY";
    if (payload.quiz?.status === "GENERATING") return payload.quiz.stage ?? "PREPARING_QUIZ";
    if (payload.content?.status === "READY") return "PREPARING_QUIZ";
    if (payload.content?.status === "GENERATING") return payload.content.stage ?? "PREPARING_CONTEXT";
    return "PREPARING_CONTEXT";
  }, [payload]);

  const activeStage = Math.max(
    0,
    stages.findIndex((item) => item.key === stage),
  );

  if (failed) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white p-6 text-red-800 dark:border-red-900 dark:bg-neutral-900 dark:text-red-200">
        <p className="text-xs font-semibold uppercase tracking-wider">Generation failed</p>
        <h2 className="mt-2 text-xl font-semibold">This lesson could not be prepared.</h2>
        <p className="mt-3 text-sm">{failed.errorMessage || "Retry the lesson from the course page."}</p>
      </section>
    );
  }

  return (
    <GenerationSkeleton
      title="Preparing your lesson"
      description="The highlighted step is read from the lesson generation job and updates as work completes."
      stages={stages.map((item) => item.label)}
      activeStage={activeStage}
    />
  );
}
