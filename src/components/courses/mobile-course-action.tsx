"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MobileCourseActionProps = {
  actionHref: string;
  actionLabel: string;
  lessonTitle: string;
  sourceId: string;
};

export function MobileCourseAction({ actionHref, actionLabel, lessonTitle, sourceId }: MobileCourseActionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const source = document.getElementById(sourceId);
    if (!source) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    observer.observe(source);
    return () => observer.disconnect();
  }, [sourceId]);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_36px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-200 dark:border-neutral-800 dark:bg-neutral-950/95 lg:hidden ${isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}>
      <div className="mx-auto flex max-w-lg items-center gap-4">
        <div className="min-w-0 flex-1"><p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Next lesson</p><p className="truncate text-sm font-semibold">{lessonTitle}</p></div>
        <Link href={actionHref} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:outline-white">{actionLabel}</Link>
      </div>
    </div>
  );
}
