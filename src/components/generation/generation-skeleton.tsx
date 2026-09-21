const defaultStages = [
  "Preparing context",
  "Retrieving relevant learning data",
  "Generating content",
  "Finalizing",
];

export function GenerationSkeleton({
  title = "Dana is preparing this content",
  description = "This page will update when generation finishes.",
  stages = defaultStages,
  activeStage = 0,
}: {
  title?: string;
  description?: string;
  stages?: string[];
  activeStage?: number;
}) {
  const current = Math.max(0, Math.min(stages.length - 1, activeStage));

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="mt-1 inline-block size-5 rounded-full border-2 border-neutral-400 border-r-transparent motion-safe:animate-spin"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {description}
          </p>

          <ol className="mt-5 space-y-2">
            {stages.map((stage, index) => (
              <li
                key={stage}
                className={
                  "flex items-center gap-3 text-sm " +
                  (index === current
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : index < current
                      ? "text-neutral-500"
                      : "text-neutral-400")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "flex size-5 items-center justify-center rounded-full border text-[10px] " +
                    (index < current
                      ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                      : index === current
                        ? "border-neutral-500"
                        : "border-neutral-300 dark:border-neutral-700")
                  }
                >
                  {index < current ? "✓" : index + 1}
                </span>
                {stage}
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3" aria-hidden="true">
            <div className="dana-skeleton h-7 w-2/3 rounded-lg" />
            <div className="dana-skeleton h-4 w-full rounded" />
            <div className="dana-skeleton h-4 w-11/12 rounded" />
            <div className="dana-skeleton h-4 w-4/5 rounded" />
          </div>
        </div>
      </div>
    </section>
  );
}
