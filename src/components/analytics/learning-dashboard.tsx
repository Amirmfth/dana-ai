import Link from "next/link";

import { formatDurationMinutes, formatStudySeconds } from "@/lib/analytics/core";

export type LearningDashboardData = {
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  studySeconds: number;
  quizAverage: number | null;
  latestActivity: Date | null;
  courses: Array<{
    id: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
    remainingMinutes: number;
  }>;
};

export function LearningDashboard({
  dashboard,
  showHeading = true,
  courseLimit,
}: {
  dashboard: LearningDashboardData;
  showHeading?: boolean;
  courseLimit?: number;
}) {
  if (dashboard.totalLessons === 0) return null;

  const courses =
    typeof courseLimit === "number"
      ? dashboard.courses.slice(0, courseLimit)
      : dashboard.courses;

  return (
    <section className={showHeading ? "border-t border-neutral-200 py-10 dark:border-neutral-800 sm:py-14" : "py-2"}>
      {showHeading && (
        <div className="mb-6">
          <p className="text-sm font-medium text-neutral-500">Your progress</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Learning dashboard
          </h2>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Overall progress"
          value={dashboard.progressPercent + "%"}
          detail={dashboard.completedLessons + "/" + dashboard.totalLessons + " lessons"}
        />
        <Metric
          label="Study time"
          value={formatStudySeconds(dashboard.studySeconds)}
          detail="Tracked active time"
        />
        <Metric
          label="Quiz average"
          value={dashboard.quizAverage === null ? "—" : dashboard.quizAverage + "%"}
          detail="Across completed runs"
        />
        <Metric
          label="Last activity"
          value={dashboard.latestActivity ? dashboard.latestActivity.toLocaleDateString() : "—"}
          detail={
            dashboard.latestActivity
              ? dashboard.latestActivity.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Start a lesson"
          }
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-500">Courses</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Course progress
            </h2>
          </div>
          <span className="text-sm text-neutral-500">
            {dashboard.courses.length} total
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={"/courses/" + course.id + "/analytics"}
              className="rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{course.title}</p>
                <span className="text-sm font-semibold">{course.percent}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-neutral-950 dark:bg-white"
                  style={{ width: course.percent + "%" }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {course.completed}/{course.total} lessons · ~
                {formatDurationMinutes(course.remainingMinutes)} remaining
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </article>
  );
}
