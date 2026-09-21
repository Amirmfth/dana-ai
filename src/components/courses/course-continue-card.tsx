import Link from "next/link";
import { AnimatedProgress } from "@/components/ui/animated-progress";

type CourseContinueCardProps = {
  actionHref?: string;
  completedCount: number;
  hasProgress: boolean;
  lessonCount: number;
  lessonTitle?: string;
  moduleOrder?: number;
  moduleTitle?: string;
};

export function CourseContinueCard({ actionHref, completedCount, hasProgress, lessonCount, lessonTitle, moduleOrder, moduleTitle }: CourseContinueCardProps) {
  const percent = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;

  return (
    <aside className="border-l-2 border-neutral-950 pl-5 dark:border-white sm:pl-7 lg:rounded-2xl lg:border lg:border-neutral-200 lg:bg-white lg:p-7 lg:shadow-[0_18px_50px_-32px_rgba(0,0,0,0.35)] dark:lg:border-neutral-800 dark:lg:bg-neutral-900 dark:lg:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{hasProgress ? "Continue learning" : "Start learning"}</p>
      {lessonTitle ? (
        <>
          <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Module {moduleOrder}{moduleTitle && <span aria-hidden="true"> · </span>}<span className="sr-only">: </span>{moduleTitle}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance">{lessonTitle}</h2>
        </>
      ) : <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Lessons will appear here when this course has content.</p>}

      {hasProgress && lessonCount > 0 && (
        <div className="mt-5">
          <AnimatedProgress
            value={percent}
            label={completedCount + " of " + lessonCount + " lessons complete"}
          />
        </div>
      )}

      {actionHref && <Link id="course-primary-action" href={actionHref} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:outline-white">{hasProgress ? "Continue lesson" : "Start course"}<ArrowIcon /></Link>}
    </aside>
  );
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
