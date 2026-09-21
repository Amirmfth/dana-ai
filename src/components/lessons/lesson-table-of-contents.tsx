"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { useLessonMobileControls } from "@/components/lessons/lesson-mobile-controls";

export type LessonTocSection = {
  id: string;
  title: string;
  type: "text" | "example" | "note" | "list" | "diagram";
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
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const visibleSections = useRef(new Set<string>());
  const desktopCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const {
    setTutorOpen,
    isFocusMode,
    toggleFocusMode,
    fontSize,
    setFontSize,
    readingTheme,
    setReadingTheme,
    dyslexiaFriendly,
    setDyslexiaFriendly,
    isSavingReadingPreferences,
    hasQuiz,
    isQuizOpen,
    setQuizOpen,
  } = useLessonMobileControls();

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
        className="lesson-toc-desktop sticky top-2 hidden h-[calc(100dvh-4rem)] max-h-168 w-8 self-start lg:block"
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
                {section.type === "text" ? (
                  <span
                    className={`block transition-all duration-200 motion-reduce:transition-none ${lineClass(
                      Math.abs(index - activeIndex),
                    )}`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={
                      "flex size-6 items-center justify-center rounded-md transition " +
                      (section.id === activeId
                        ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                        : "text-neutral-400 dark:text-neutral-500")
                    }
                  >
                    <SectionTypeIcon type={section.type} className="size-3.5" />
                  </span>
                )}
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
                  className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 ${
                    section.id === activeId
                    ? "bg-neutral-100 font-semibold text-neutral-950 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {section.type !== "text" && (
                    <span aria-hidden="true" className="shrink-0 text-neutral-400">
                      <SectionTypeIcon type={section.type} className="size-4" />
                    </span>
                  )}
                  <span
                    className={
                      "truncate " +
                      (section.type === "text"
                        ? "text-[0.9375rem] font-semibold"
                        : "text-sm font-medium")
                    }
                  >
                    {section.title}
                  </span>
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
                      className={
                        "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:outline-white " +
                        (section.id === activeId
                          ? "bg-neutral-100 dark:bg-neutral-800"
                          : "")
                      }
                    >
                      {section.type !== "text" && (
                        <span aria-hidden="true" className="shrink-0 text-neutral-400">
                          <SectionTypeIcon type={section.type} className="size-4" />
                        </span>
                      )}
                      <span
                        className={
                          "truncate " +
                          (section.type === "text"
                            ? "text-[0.9375rem] font-semibold"
                            : "text-sm font-medium")
                        }
                      >
                        {section.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAppearanceOpen && (
            <motion.div
              key="mobile-reading-appearance"
              initial={{ opacity: 0, x: "-50%", y: 12, scale: 0.96 }}
              animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: 12, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed bottom-20 left-1/2 z-20 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Reading appearance</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Applies to lesson content only.
                  </p>
                </div>
                {isSavingReadingPreferences && (
                  <span className="text-xs text-neutral-500">Saving…</span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Font size
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {([
                    ["SMALL", "S"],
                    ["DEFAULT", "M"],
                    ["LARGE", "L"],
                    ["EXTRA_LARGE", "XL"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFontSize(value)}
                      aria-pressed={fontSize === value}
                      className={
                        "min-h-10 rounded-xl border px-2 text-sm font-semibold " +
                        (fontSize === value
                          ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                          : "border-neutral-200 dark:border-neutral-700")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Font family
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDyslexiaFriendly(false)}
                    aria-pressed={!dyslexiaFriendly}
                    className={
                      "min-h-10 rounded-xl border px-3 text-sm font-medium " +
                      (!dyslexiaFriendly
                        ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                        : "border-neutral-200 dark:border-neutral-700")
                    }
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    onClick={() => setDyslexiaFriendly(true)}
                    aria-pressed={dyslexiaFriendly}
                    className={
                      "min-h-10 rounded-xl border px-3 text-sm font-medium " +
                      (dyslexiaFriendly
                        ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                        : "border-neutral-200 dark:border-neutral-700")
                    }
                  >
                    Dyslexia friendly
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Lesson theme
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([
                    ["DEFAULT", "Default"],
                    ["PAPER", "Paper"],
                    ["SEPIA", "Sepia"],
                    ["DARK", "Dark"],
                    ["HIGH_CONTRAST", "Contrast"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReadingTheme(value)}
                      aria-pressed={readingTheme === value}
                      className={
                        "min-h-10 rounded-xl border px-3 text-sm font-medium " +
                        (readingTheme === value
                          ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                          : "border-neutral-200 dark:border-neutral-700")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-5 left-1/2 z-20 flex h-11 -translate-x-1/2 items-center rounded-full bg-white p-1 shadow-lg ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700">
          {!isFocusMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsAppearanceOpen(false);
                  setQuizOpen(false);
                  setIsOpen((open) => !open);
                }}
                className="flex size-9 items-center justify-center rounded-full text-neutral-950 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
                aria-label={isOpen ? "Close table of contents" : "Open table of contents"}
                aria-expanded={isOpen}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                  <path d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
                </svg>
              </button>
              <span aria-hidden="true" className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              toggleFocusMode();
            }}
            className="flex size-9 items-center justify-center rounded-full text-neutral-950 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
            aria-label={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
            aria-pressed={isFocusMode}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-5">
              <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <span aria-hidden="true" className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setQuizOpen(false);
              setIsAppearanceOpen((open) => !open);
            }}
            className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-neutral-950 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
            aria-label="Reading appearance"
            aria-expanded={isAppearanceOpen}
          >
            Aa
          </button>

          {!isFocusMode && hasQuiz && (
            <>
              <span aria-hidden="true" className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsAppearanceOpen(false);
                  setTutorOpen(false);
                  setQuizOpen(!isQuizOpen);
                }}
                className="min-h-9 rounded-full px-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
                aria-expanded={isQuizOpen}
                aria-controls="lesson-quiz-sheet"
              >
                Quiz
              </button>
            </>
          )}

          {!isFocusMode && (
            <>
              <span aria-hidden="true" className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button
                id="ask-dana-trigger-mobile"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsAppearanceOpen(false);
                  setQuizOpen(false);
                  setTutorOpen(true);
                }}
                className="min-h-9 rounded-full px-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
                aria-haspopup="dialog"
              >
                Ask Dana
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}


function SectionTypeIcon({
  type,
  className,
}: {
  type: Exclude<LessonTocSection["type"], "text">;
  className?: string;
}) {
  if (type === "example") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
        <path d="M4 5.5h12v9H4zM7 8l2 2-2 2M11 12h2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "note") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
        <path d="M5 3.5h8l2 2v11H5zM8 8h4M8 11h4M8 14h2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "list") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
        <path d="M7 5h8M7 10h8M7 15h8M4 5h.01M4 10h.01M4 15h.01" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="2.5" y="7.5" width="5" height="5" rx="1" />
      <rect x="12.5" y="2.5" width="5" height="5" rx="1" />
      <rect x="12.5" y="12.5" width="5" height="5" rx="1" />
      <path d="M7.5 10h2.5c1.5 0 2.5-1 2.5-2.5M10 10c1.5 0 2.5 1 2.5 2.5" strokeLinecap="round" />
    </svg>
  );
}
