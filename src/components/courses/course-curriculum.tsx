"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  concepts: string[];
  order: number;
  status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  difficulty: "INTRODUCTORY" | "EASY" | "MEDIUM" | "HARD" | "ADVANCED";
  isOptional: boolean;
  completionMethod: "STUDIED" | "TESTED_OUT" | "SKIPPED" | null;
  prerequisiteCount: number;
};

type CourseModule = {
  id: string;
  title: string;
  description: string | null;
  objective: string | null;
  order: number;
  lessons: Lesson[];
};

export function CourseCurriculum({
  courseId,
  modules,
}: {
  courseId: string;
  modules: CourseModule[];
}) {
  const currentModule = modules.find((module) =>
    module.lessons.some((lesson) => lesson.status === "IN_PROGRESS"),
  );
  const defaultModule = currentModule ?? modules[0];
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set(defaultModule ? [defaultModule.id] : []),
  );
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const filteredModules = useMemo(() => {
    if (!normalizedQuery) return modules;

    return modules.flatMap((module) => {
      const moduleMatches = [module.title, module.description, module.objective]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      const matchingLessons = module.lessons.filter((lesson) =>
        [lesson.title, lesson.description, ...lesson.concepts]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
      );

      if (!moduleMatches && matchingLessons.length === 0) return [];
      return [
        {
          ...module,
          lessons: moduleMatches ? module.lessons : matchingLessons,
        },
      ];
    });
  }, [modules, normalizedQuery]);

  function toggleModule(moduleId: string) {
    setOpenModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <section
      id="curriculum"
      aria-labelledby="curriculum-heading"
      className="scroll-mt-32 py-10 sm:py-14"
    >
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Course outline
          </p>
          <h2
            id="curriculum-heading"
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Curriculum
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {modules.length} modules to work through at your pace.
          </p>
        </div>

        {modules.some((module) => module.lessons.length > 0) && (
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search lessons or topics</span>
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lessons or topics"
              className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white py-2.5 pr-4 pl-10 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white dark:focus:ring-white/15"
            />
          </label>
        )}
      </div>

      {filteredModules.length > 0 ? (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
          {filteredModules.map((module) => {
            const isOpen = normalizedQuery ? true : openModules.has(module.id);
            const contentId = `module-${module.id}-content`;
            const completedLessons = module.lessons.filter(
              (lesson) => lesson.status === "COMPLETED",
            ).length;

            return (
              <section
                key={module.id}
                className="border-b border-neutral-200 dark:border-neutral-800"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggleModule(module.id)}
                  className="group grid min-h-20 w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left transition hover:bg-neutral-100/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950 dark:hover:bg-neutral-900/70 dark:focus-visible:outline-white sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-5 sm:py-5"
                >
                  <span className="font-mono text-sm font-medium tabular-nums text-neutral-400 dark:text-neutral-500">
                    {String(module.order).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-lg">
                      {module.title}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {completedLessons > 0 && `${completedLessons} of `}
                      {module.lessons.length}{" "}
                      {module.lessons.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </span>
                  <span className="mr-1 flex size-10 items-center justify-center rounded-full text-neutral-500 transition group-hover:bg-white group-hover:text-neutral-950 dark:group-hover:bg-neutral-800 dark:group-hover:text-white">
                    <ChevronIcon isOpen={isOpen} />
                  </span>
                </button>

                <div
                  id={contentId}
                  className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <div className="pb-5 pl-9 sm:pb-7 sm:pl-[4.25rem]">
                      {module.description && (
                        <p className="mb-4 max-w-2xl pr-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                          {module.description}
                        </p>
                      )}
                      {module.lessons.length > 0 ? (
                        <ol className="border-t border-neutral-200 dark:border-neutral-800">
                          {module.lessons.map((lesson) => (
                            <LessonRow
                              key={lesson.id}
                              courseId={courseId}
                              lesson={lesson}
                            />
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No lessons in this module yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="border-y border-neutral-200 py-12 text-center dark:border-neutral-800">
          <p className="font-medium">No matching lessons</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Try a lesson title, module, or topic.
          </p>
        </div>
      )}
    </section>
  );
}

function LessonRow({ courseId, lesson }: { courseId: string; lesson: Lesson }) {
  const isCompleted = lesson.status === "COMPLETED";

  const isCurrent = lesson.status === "IN_PROGRESS";

  const isLocked = lesson.status === "LOCKED";

  const topicPreview = lesson.concepts.slice(0, 2).join(" · ");

  const remainingTopics = Math.max(0, lesson.concepts.length - 2);

  const content = (
    <>
      <LessonMarker order={lesson.order} status={lesson.status} />

      <span className="min-w-0">
        <span
          className={`block text-sm font-semibold leading-5 sm:text-[0.95rem] ${
            isLocked
              ? "text-neutral-400 dark:text-neutral-600"
              : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {lesson.title}
        </span>

        <span className="mt-1 block truncate text-xs text-neutral-500 dark:text-neutral-400">
          {isCompleted
            ? lesson.completionMethod === "TESTED_OUT"
              ? "Tested out"
              : lesson.completionMethod === "SKIPPED"
                ? "Skipped"
                : "Completed"
            : isCurrent
              ? "In progress"
              : isLocked
                ? "Locked"
                : topicPreview || lesson.description || "Open lesson"}
          {" · "}{lesson.difficulty.toLowerCase()}
          {lesson.isOptional ? " · optional" : ""}
          {lesson.prerequisiteCount > 1 ? " · " + lesson.prerequisiteCount + " prerequisites" : ""}

          {!isCompleted && !isCurrent && !isLocked && remainingTopics > 0
            ? ` +${remainingTopics}`
            : ""}
        </span>
      </span>

      <span className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
        {isCurrent && <span className="hidden sm:inline">Continue</span>}

        {isLocked ? <LockIcon /> : <ArrowIcon />}
      </span>
    </>
  );

  return (
    <li className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
      {isLocked ? (
        <div className="grid min-h-16 cursor-not-allowed grid-cols-[2rem_minmax(0,1fr)_2.25rem] items-center gap-3 rounded-lg px-2 py-3 opacity-70 sm:min-h-18 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:px-3">
          {content}
        </div>
      ) : (
        <Link
          href={`/courses/${courseId}/lessons/${lesson.id}`}
          aria-current={isCurrent ? "step" : undefined}
          className={`group grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_2.25rem] items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950 dark:hover:bg-neutral-800/70 dark:focus-visible:outline-white sm:min-h-18 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:px-3 ${
            isCurrent ? "bg-neutral-100 dark:bg-neutral-900" : ""
          }`}
        >
          {content}
        </Link>
      )}
    </li>
  );
}

function LessonMarker({
  order,
  status,
}: {
  order: number;
  status: Lesson["status"];
}) {
  if (status === "COMPLETED") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
        <svg
          aria-label="Completed"
          role="img"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="size-3.5"
        >
          <path
            d="m5 10 3 3 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${status === "IN_PROGRESS" ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950" : "border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"}`}
    >
      <span className="sr-only">Lesson </span>
      {order}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
    >
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
    >
      <path
        d="M4 10h12m-4-4 4 4-4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="size-4"
    >
      <rect x="5" y="9" width="10" height="8" rx="2" />

      <path d="M7.5 9V6.5a2.5 2.5 0 0 1 5 0V9" strokeLinecap="round" />
    </svg>
  );
}
