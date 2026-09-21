"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { finishCourseGenerationAction } from "@/app/actions/courses";
import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

type Status = "NOT_STARTED" | "GENERATING" | "READY" | "FAILED";

type Progress = {
  status: Status;
  stage: string;
  errorMessage?: string | null;
};

const stages = [
  { key: "PROCESSING_SOURCES", label: "Processing source material" },
  { key: "PLANNING_CURRICULUM", label: "Planning the curriculum" },
  { key: "BUILDING_COURSE", label: "Creating modules and lessons" },
  { key: "FINALIZING", label: "Saving course structure" },
  { key: "READY", label: "Course ready" },
];

export function CourseGenerationProgress({ courseId }: { courseId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [progress, setProgress] = useState<Progress>({
    status: "NOT_STARTED",
    stage: "PLANNING_CURRICULUM",
  });
  const [requestError, setRequestError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    const response = await fetch("/api/generation/course/" + courseId, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const next = (await response.json()) as Progress;
    setProgress(next);

    if (next.status === "READY") {
      router.replace("/courses/" + courseId);
      router.refresh();
    }
  }, [courseId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void finishCourseGenerationAction(courseId)
      .then(() => loadProgress())
      .catch((error: unknown) => {
        setRequestError(
          error instanceof Error ? error.message : "Course generation failed.",
        );
        void loadProgress();
      });
  }, [courseId, loadProgress]);

  useEffect(() => {
    void loadProgress();
    const timer = window.setInterval(() => void loadProgress(), 700);
    return () => window.clearInterval(timer);
  }, [loadProgress]);

  const activeStage = useMemo(() => {
    const index = stages.findIndex((item) => item.key === progress.stage);
    return index >= 0 ? index : 0;
  }, [progress.stage]);

  if (progress.status === "FAILED" || requestError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">
          Generation failed
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Dana could not finish this course.</h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">
          Failed during {stages.find((item) => item.key === progress.stage)?.label ?? "generation"}
        </p>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {progress.errorMessage || requestError || "Please retry course generation."}
        </p>
        <button
          type="button"
          onClick={() => {
            started.current = false;
            setRequestError(null);
            setProgress((current) => ({ ...current, status: "NOT_STARTED" }));
            void finishCourseGenerationAction(courseId)
              .then(() => loadProgress())
              .catch((error: unknown) =>
                setRequestError(
                  error instanceof Error ? error.message : "Course generation failed.",
                ),
              );
          }}
          className="mt-5 min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
        >
          Retry generation
        </button>
      </section>
    );
  }

  return (
    <GenerationSkeleton
      title="Building your course"
      description="This progress comes from the server. You can refresh this page without starting another generation."
      stages={stages.map((item) => item.label)}
      activeStage={activeStage}
    />
  );
}
