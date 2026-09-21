import { LessonGenerationProgress } from "@/components/generation/lesson-generation-progress";

export default function LessonLoading() {
  return (
    <main className="min-h-dvh bg-white px-5 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <LessonGenerationProgress />
      </div>
    </main>
  );
}
