export default function LessonLoading() {
  return (
    <main className="min-h-dvh bg-white dark:bg-neutral-950 lg:p-0">
      <div className="lg:grid lg:grid-cols-2 lg:items-start">
        <div>
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:max-w-none lg:px-12 lg:pb-10">
            <div className="max-w-3xl animate-pulse">
              <div className="mb-4 h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mb-4 h-10 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-5 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
            </div>
          </div>

          <div className="px-5 pb-24 sm:px-8 lg:px-0 lg:pb-0">
            <div className="mx-auto max-w-2xl space-y-10 animate-pulse lg:mx-0 lg:max-w-none lg:px-12 xl:px-[max(3rem,calc((100vw-80rem)/2))]">
              {[1, 2, 3, 4].map((item) => (
                <div key={item}>
                  <div className="mb-4 h-7 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="space-y-3">
                    <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
                    <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
                    <div className="h-4 w-4/5 rounded bg-neutral-100 dark:bg-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden h-dvh border-l border-neutral-200 bg-neutral-50/70 p-8 dark:border-neutral-800 dark:bg-neutral-900/70 lg:block xl:p-10">
          <div className="mb-6 h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-3 h-7 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
        </div>
      </div>
    </main>
  );
}
