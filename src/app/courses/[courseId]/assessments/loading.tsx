import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

export default function AssessmentsLoading() {
  return (
    <main className="min-h-dvh bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <GenerationSkeleton
          title="Preparing assessment"
          description="If this assessment has not been generated yet, Dana will create a version from your current curriculum."
          stages={[
            "Checking assessment eligibility",
            "Collecting lesson objectives",
            "Generating questions",
            "Preparing your attempt",
          ]}
          activeStage={0}
        />
      </div>
    </main>
  );
}
