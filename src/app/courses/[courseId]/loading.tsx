import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

export default function CourseLoading() {
  return (
    <main className="min-h-dvh bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <GenerationSkeleton
          title="Loading your course"
          description="Dana is preparing curriculum, progress, prerequisites, and assessment state."
          stages={[
            "Loading curriculum",
            "Checking learning progress",
            "Resolving prerequisites",
            "Preparing your next step",
          ]}
          activeStage={0}
        />
      </div>
    </main>
  );
}
