import Link from "next/link";

import { requireUser } from "@/lib/auth/server";
import { searchLearningWorkspace } from "@/lib/search/workspace";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = await searchLearningWorkspace(user.id, query);
  const total =
    results.courses.length +
    results.modules.length +
    results.lessons.length +
    results.concepts.length +
    results.memories.length +
    results.sources.length;

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Back to Dana
      </Link>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">
        Search your learning workspace
      </h1>
      <form action="/search" className="mt-6 flex gap-3">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Search courses, lessons, concepts, memories, sources…"
          className="min-h-12 flex-1 rounded-xl border border-neutral-300 bg-transparent px-4 outline-none dark:border-neutral-700"
        />
        <button className="rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
          Search
        </button>
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="mt-6 text-sm text-neutral-500">
          Enter at least two characters.
        </p>
      )}

      {query.length >= 2 && total === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-8 text-neutral-500 dark:border-neutral-700">
          No results for “{query}”.
        </div>
      )}

      {total > 0 && (
        <div className="mt-8 space-y-10">
          <ResultSection title="Courses" count={results.courses.length}>
            {results.courses.map((course) => (
              <ResultLink key={course.id} href={"/courses/" + course.id} title={course.title}>
                {course.description ?? course.status.toLowerCase()}
              </ResultLink>
            ))}
          </ResultSection>

          <ResultSection title="Modules" count={results.modules.length}>
            {results.modules.map((module) => (
              <ResultLink key={module.id} href={"/courses/" + module.course.id} title={module.title}>
                {module.course.title}{module.description ? " · " + module.description : ""}
              </ResultLink>
            ))}
          </ResultSection>

          <ResultSection title="Lessons" count={results.lessons.length}>
            {results.lessons.map((lesson) => (
              <ResultLink
                key={lesson.id}
                href={"/courses/" + lesson.module.course.id + "/lessons/" + lesson.id}
                title={lesson.title}
              >
                {lesson.module.course.title} · {lesson.module.title}
              </ResultLink>
            ))}
          </ResultSection>

          <ResultSection title="Concepts" count={results.concepts.length}>
            {results.concepts.map((concept) => (
              <ResultLink
                key={concept.lessonId + concept.concept}
                href={"/courses/" + concept.courseId + "/lessons/" + concept.lessonId}
                title={concept.concept}
              >
                {concept.courseTitle} · {concept.lessonTitle}
              </ResultLink>
            ))}
          </ResultSection>

          <ResultSection title="Learner memories" count={results.memories.length}>
            {results.memories.map((memory) => (
              <ResultLink key={memory.id} href="/settings/memory" title={memory.content}>
                {memory.course.title} · {memory.type.toLowerCase().replaceAll("_", " ")}
                {!memory.isActive ? " · inactive" : ""}
              </ResultLink>
            ))}
          </ResultSection>

          <ResultSection title="Sources" count={results.sources.length}>
            {results.sources.map((source) => (
              <ResultLink
                key={source.id}
                href={"/courses/" + source.course!.id + "/sources"}
                title={source.title}
              >
                {source.course!.title} · {source.type} · {source.status.toLowerCase()}
              </ResultLink>
            ))}
          </ResultSection>
        </div>
      )}
    </main>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold">
        {title} <span className="text-sm font-normal text-neutral-500">({count})</span>
      </h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function ResultLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{children}</p>
    </Link>
  );
}
