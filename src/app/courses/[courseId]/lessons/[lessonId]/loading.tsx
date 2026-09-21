import { GenerationSkeleton } from "@/components/generation/generation-skeleton";

export default function LessonLoading() {
  return (
    <main className="min-h-dvh bg-white px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <GenerationSkeleton
          title="Preparing your lesson"
          description="Dana is loading the lesson workspace and, when needed, generating the lesson and knowledge check."
          stages={[
            "Preparing lesson context",
            "Retrieving relevant memories and sources",
            "Generating lesson content",
            "Preparing the knowledge check",
          ]}
          activeStage={0}
        />
      </div>
    </main>
  );
}
