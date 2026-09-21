import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

export default function RegenerationLoading() {
  return (
    <main className="min-h-dvh bg-neutral-50 px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <GenerationSkeleton
          title="Loading regeneration workspace"
          description="Dana is reading version history and persisted generation state."
          stages={[
            "Loading version history",
            "Checking active generation jobs",
            "Checking regeneration locks",
            "Preparing controls",
          ]}
          activeStage={0}
        />
      </div>
    </main>
  );
}
