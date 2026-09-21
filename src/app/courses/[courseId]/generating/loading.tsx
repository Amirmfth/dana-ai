import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

export default function CourseGeneratingLoading() {
  return (
    <main className="min-h-dvh bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <GenerationSkeleton
          title="Preparing course generation"
          description="Dana is reconnecting to the persisted generation job."
          stages={[
            "Processing source material",
            "Planning the curriculum",
            "Creating modules and lessons",
            "Saving course structure",
            "Course ready",
          ]}
          activeStage={0}
        />
      </div>
    </main>
  );
}
