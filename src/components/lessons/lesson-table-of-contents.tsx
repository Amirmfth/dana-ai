"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { useLessonMobileControls } from "@/components/lessons/lesson-mobile-controls";

export type LessonTocSection = {
  id: string;
  title: string;
};

type LessonTableOfContentsProps = {
  sections: LessonTocSection[];
};

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  section.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

function lineClass(distance: number) {
  if (distance === 0) return "h-0.5 w-8 bg-neutral-950 dark:bg-white";
  if (distance === 1) return "h-0.5 w-[26px] bg-neutral-800 dark:bg-neutral-200";
  if (distance === 2) return "h-px w-[22px] bg-neutral-600 dark:bg-neutral-400";
  return "h-px w-4 bg-neutral-400 dark:bg-neutral-600";
}

export function LessonTableOfContents({
  sections,
}: LessonTableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const visibleSections = useRef(new Set<string>());
  const desktopCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const { setTutorOpen } = useLessonMobileControls();

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            visibleSections.current.add(entry.target.id);
          else visibleSections.current.delete(entry.target.id);
        });

        const nearestVisibleSection = sections
          .filter((section) => visibleSections.current.has(section.id))
          .map((section) => ({
            id: section.id,
            distance: Math.abs(
              document.getElementById(section.id)?.getBoundingClientRect()
                .top ?? Infinity,
            ),
          }))
          .sort((first, second) => first.distance - second.distance)[0];

        if (nearestVisibleSection) setActiveId(nearestVisibleSection.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  function selectSection(id: string) {
    setIsOpen(false);
    requestAnimationFrame(() => scrollToSection(id));
  }

  function openDesktopToc() {
    if (desktopCloseTimer.current) clearTimeout(desktopCloseTimer.current);
    setIsDesktopOpen(true);
  }

  function closeDesktopToc() {
    desktopCloseTimer.current = setTimeout(() => setIsDesktopOpen(false), 150);
  }

  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId),
  );

  return (
    <>
      <nav
        aria-label="Lesson sections"
        className="sticky top-2 hidden h-[calc(100dvh-4rem)] max-h-168 w-8 self-start lg:block"
        onMouseEnter={openDesktopToc}
        onMouseLeave={closeDesktopToc}
        onFocus={openDesktopToc}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            closeDesktopToc();
        }}
      >
        <ul className="flex h-full flex-col justify-between py-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="flex min-h-6 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
                aria-label={`Go to ${section.title}`}
                aria-current={section.id === activeId ? "location" : undefined}
              >
                <span
                  className={`block transition-all duration-200 motion-reduce:transition-none ${lineClass(
                    Math.abs(index - activeIndex),
                  )}`}
                />
              </button>
            </li>
          ))}
        </ul>

        <div
          className={`absolute left-0 top-0 z-10 w-70 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 ${
            isDesktopOpen ? "block" : "hidden"
          }`}
        >
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Lesson sections
          </p>

          <ul className="max-h-[calc(100dvh-5rem)] space-y-1 overflow-y-auto scrollbar-none">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDesktopOpen(false);
                    scrollToSection(section.id);
                  }}
                  className={`min-h-10 w-full truncate rounded-lg px-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 ${
                    section.id === activeId
                    ? "bg-neutral-100 font-semibold text-neutral-950 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="lg:hidden">
        <AnimatePresence>
          {isOpen && (
            <motion.nav
              key="mobile-lesson-toc"
              aria-label="Lesson sections"
              initial={{ opacity: 0, x: "-50%", y: 12, scale: 0.96 }}
              animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: 12, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-20 left-1/2 z-20 max-h-[60dvh] w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            >
              <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Lesson sections
              </p>
              <ul className="space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => selectSection(section.id)}
                      className="min-h-11 w-full truncate rounded-xl px-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="fixed bottom-5 left-1/2 z-20 flex h-11 -translate-x-1/2 items-center rounded-full bg-white p-1 shadow-lg ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex size-9 items-center justify-center rounded-full text-neutral-950 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
            aria-label={
              isOpen ? "Close table of contents" : "Open table of contents"
            }
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-5"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-5"
              >
                <path
                  d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          <span aria-hidden="true" className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
          <button
            id="ask-dana-trigger-mobile"
            type="button"
            onClick={() => setTutorOpen(true)}
            className="min-h-9 rounded-full px-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
            aria-haspopup="dialog"
          >
            Ask Dana
          </button>
        </div>
      </div>
    </>
  );
}
