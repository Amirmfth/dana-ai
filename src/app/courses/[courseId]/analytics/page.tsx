import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import { getCourseAnalytics } from "@/lib/analytics/course";
import { formatDurationMinutes, formatStudySeconds } from "@/lib/analytics/core";

function eventLabel(type: string) {
  if (type === "LESSON_STARTED") return "Started lesson";
  if (type === "LESSON_COMPLETED") return "Completed lesson";
  return "Completed quiz";
}

export default async function CourseAnalyticsPage({ params }: PageProps<"/courses/[courseId]/analytics">) {
  const user = await requireUser();
  const { courseId } = await params;
  const analytics = await getCourseAnalytics(user.id, courseId);
  if (!analytics) notFound();

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <div>
            <Link href={"/courses/" + courseId} className="text-sm font-medium underline underline-offset-4">Back to course</Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Learning analytics</h1>
            <p className="mt-2 text-neutral-500">{analytics.course.title}</p>
          </div>
          {analytics.latestActivity && <p className="text-sm text-neutral-500">Last activity {analytics.latestActivity.toLocaleString()}</p>}
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Course progress" value={analytics.progress.percent + "%"} detail={analytics.progress.completedLessons + "/" + analytics.progress.totalLessons + " lessons"} />
          <Metric label="Study time" value={formatStudySeconds(analytics.studySeconds)} detail="Active lesson time" />
          <Metric label="Quiz average" value={analytics.quizAverage === null ? "—" : analytics.quizAverage + "%"} detail={analytics.quizRuns.length + " completed runs"} />
          <Metric label="Estimated remaining" value={formatDurationMinutes(analytics.remainingMinutes)} detail="Based on remaining lessons" />
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Lesson estimates</h2>
          <div className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {analytics.lessonEstimates.map((lesson) => (
              <div key={lesson.lessonId} className="flex items-center justify-between gap-4 p-4">
                <div><p className="font-medium">{lesson.title}</p><p className="text-xs text-neutral-500">{lesson.moduleTitle} · {lesson.status}</p></div>
                <span className="text-sm font-semibold">~{lesson.minutes} min</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Concept performance</h2>
          {analytics.concepts.length === 0 ? <p className="mt-3 text-sm text-neutral-500">Answer quiz questions to build concept analytics.</p> : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analytics.concepts.map((concept) => (
                <article key={concept.concept} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{concept.concept}</h3><span className="text-xs font-semibold">{concept.band.toLowerCase()}</span></div>
                  <p className="mt-2 text-2xl font-semibold">{concept.accuracy}%</p>
                  <p className="mt-1 text-xs text-neutral-500">{concept.correct}/{concept.attempts} correct</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Assessment history</h2>
          {analytics.quizRuns.length === 0 ? <p className="mt-3 text-sm text-neutral-500">No completed quiz runs yet.</p> : (
            <div className="mt-4 space-y-3">{analytics.quizRuns.map((run) => (
              <article key={run.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div><p className="font-medium">{run.lessonTitle}</p><p className="text-xs text-neutral-500">{run.moduleTitle} · {run.completedAt.toLocaleString()}</p></div>
                <p className="text-lg font-semibold">{run.score}/{run.total} · {Math.round((run.score / run.total) * 100)}%</p>
              </article>
            ))}</div>
          )}
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Learning history</h2>
          <div className="mt-4 space-y-3">{analytics.events.length === 0 ? <p className="text-sm text-neutral-500">No learning events yet.</p> : analytics.events.map((event) => (
            <article key={event.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="font-medium">{eventLabel(event.type)}{event.lessonTitle ? ": " + event.lessonTitle : ""}</p>
              <p className="mt-1 text-xs text-neutral-500">{event.moduleTitle ?? analytics.course.title} · {event.createdAt.toLocaleString()}</p>
            </article>
          ))}</div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></article>;
}
