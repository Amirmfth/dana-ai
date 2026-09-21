import type { ReactNode } from "react";

type RouteLoadingVariant =
  | "home"
  | "analytics"
  | "form"
  | "list"
  | "search"
  | "workspace";

export function RouteLoadingSkeleton({
  variant,
  titleWidth = "w-48",
}: {
  variant: RouteLoadingVariant;
  titleWidth?: string;
}) {
  if (variant === "home") return <HomeSkeleton />;
  if (variant === "analytics") return <AnalyticsSkeleton titleWidth={titleWidth} />;
  if (variant === "form") return <FormSkeleton titleWidth={titleWidth} />;
  if (variant === "search") return <SearchSkeleton />;
  if (variant === "workspace") return <WorkspaceSkeleton titleWidth={titleWidth} />;
  return <ListSkeleton titleWidth={titleWidth} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </div>
    </main>
  );
}

function HeaderSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800" aria-hidden="true">
      <div className="dana-skeleton h-4 w-24 rounded" />
      <div className={"dana-skeleton mt-4 h-9 rounded-lg " + titleWidth} />
      <div className="dana-skeleton mt-3 h-4 w-full max-w-xl rounded" />
    </header>
  );
}

function HomeSkeleton() {
  return (
    <Shell>
      <div className="flex items-center justify-between" aria-hidden="true">
        <div className="dana-skeleton h-5 w-20 rounded" />
        <div className="dana-skeleton size-11 rounded-full" />
      </div>

      <section className="py-16 text-center" aria-busy="true" aria-label="Loading home">
        <div className="dana-skeleton mx-auto h-4 w-36 rounded" />
        <div className="dana-skeleton mx-auto mt-5 h-12 w-full max-w-xl rounded-xl" />
        <div className="dana-skeleton mx-auto mt-4 h-5 w-full max-w-2xl rounded" />
        <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="dana-skeleton h-24 w-full rounded-xl" />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="dana-skeleton size-10 rounded-full" />
              <div className="dana-skeleton h-10 w-28 rounded-full" />
            </div>
            <div className="dana-skeleton h-11 w-32 rounded-full" />
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-200 pt-10 dark:border-neutral-800" aria-hidden="true">
        <div className="dana-skeleton h-7 w-44 rounded" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="dana-skeleton h-4 w-16 rounded" />
              <div className="dana-skeleton mt-4 h-6 w-3/4 rounded" />
              <div className="dana-skeleton mt-4 h-4 w-full rounded" />
              <div className="dana-skeleton mt-2 h-4 w-5/6 rounded" />
              <div className="dana-skeleton mt-10 h-4 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function AnalyticsSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <Shell>
      <HeaderSkeleton titleWidth={titleWidth} />
      <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading analytics">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="dana-skeleton h-3 w-24 rounded" />
            <div className="dana-skeleton mt-4 h-9 w-20 rounded" />
            <div className="dana-skeleton mt-3 h-3 w-28 rounded" />
          </div>
        ))}
      </section>
      <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="dana-skeleton h-5 w-1/2 rounded" />
            <div className="dana-skeleton mt-4 h-2 w-full rounded-full" />
            <div className="dana-skeleton mt-3 h-3 w-36 rounded" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

function FormSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <Shell>
      <HeaderSkeleton titleWidth={titleWidth} />
      <div className="mt-8 max-w-3xl space-y-5" aria-busy="true" aria-label="Loading form">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="dana-skeleton h-5 w-36 rounded" />
            <div className="dana-skeleton mt-4 h-11 w-full rounded-xl" />
            <div className="dana-skeleton mt-3 h-11 w-full rounded-xl" />
          </div>
        ))}
        <div className="dana-skeleton h-11 w-36 rounded-xl" />
      </div>
    </Shell>
  );
}

function ListSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <Shell>
      <HeaderSkeleton titleWidth={titleWidth} />
      <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading content">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="dana-skeleton h-5 w-1/3 rounded" />
                <div className="dana-skeleton mt-3 h-4 w-2/3 rounded" />
              </div>
              <div className="dana-skeleton h-10 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function SearchSkeleton() {
  return (
    <Shell>
      <HeaderSkeleton titleWidth="w-36" />
      <div className="mt-6 flex gap-3" aria-hidden="true">
        <div className="dana-skeleton h-12 flex-1 rounded-xl" />
        <div className="dana-skeleton h-12 w-24 rounded-xl" />
      </div>
      <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading search">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="dana-skeleton h-5 w-2/5 rounded" />
            <div className="dana-skeleton mt-3 h-4 w-full rounded" />
            <div className="dana-skeleton mt-2 h-4 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

function WorkspaceSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <Shell>
      <HeaderSkeleton titleWidth={titleWidth} />
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-busy="true" aria-label="Loading workspace">
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="dana-skeleton h-6 w-1/3 rounded" />
              <div className="dana-skeleton mt-4 h-4 w-full rounded" />
              <div className="dana-skeleton mt-2 h-4 w-11/12 rounded" />
              <div className="dana-skeleton mt-2 h-4 w-4/5 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="dana-skeleton h-5 w-28 rounded" />
          <div className="dana-skeleton mt-5 h-10 w-full rounded-xl" />
          <div className="dana-skeleton mt-3 h-10 w-full rounded-xl" />
          <div className="dana-skeleton mt-3 h-10 w-full rounded-xl" />
        </div>
      </div>
    </Shell>
  );
}
