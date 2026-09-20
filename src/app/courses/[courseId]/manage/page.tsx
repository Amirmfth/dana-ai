import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveCourseAction,
  createLessonAction,
  createModuleAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  duplicateCourseAction,
  moveLessonAction,
  moveModuleAction,
  saveCourseAsTemplateAction,
  updateCourseAction,
  updateLessonAction,
  updateModuleAction,
} from "@/app/courses/[courseId]/manage/actions";
import { requireUser } from "@/lib/auth/server";
import { getOwnedCourse } from "@/lib/courses/management";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-white";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950";

export default async function ManageCoursePage({
  params,
}: PageProps<"/courses/[courseId]/manage">) {
  const user = await requireUser();
  const { courseId } = await params;
  const course = await getOwnedCourse(user.id, courseId);

  if (!course) notFound();

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <div>
            <Link
              href={"/courses/" + course.id}
              className="text-sm font-medium text-neutral-600 underline underline-offset-4 dark:text-neutral-300"
            >
              Back to course
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Manage curriculum
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Structural edits do not regenerate lesson bodies that were already generated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={"/courses/" + course.id + "/export"}
              className={buttonClass}
            >
              Export JSON
            </a>
            <form action={duplicateCourseAction.bind(null, course.id)}>
              <button className={buttonClass}>Duplicate</button>
            </form>
          </div>
        </header>

        <section className="py-8">
          <h2 className="text-xl font-semibold">Course settings</h2>
          <form
            action={updateCourseAction.bind(null, course.id)}
            className="mt-5 grid gap-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6"
          >
            <label className="text-sm font-medium">
              Title
              <input
                name="title"
                defaultValue={course.title}
                required
                maxLength={200}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Description
              <textarea
                name="description"
                defaultValue={course.description ?? ""}
                rows={3}
                maxLength={2000}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Learning goal
              <textarea
                name="goal"
                defaultValue={course.goal}
                required
                rows={4}
                maxLength={4000}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Persistent course instructions
              <textarea
                name="instructions"
                defaultValue={course.instructions ?? ""}
                rows={5}
                maxLength={8000}
                placeholder="Teaching preferences or constraints that should remain attached to this course."
                className={fieldClass}
              />
            </label>
            <div>
              <button className={primaryButtonClass}>Save course settings</button>
            </div>
          </form>
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Curriculum</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Add, edit, remove, or reorder modules and lessons.
              </p>
            </div>
            <form
              action={saveCourseAsTemplateAction.bind(null, course.id)}
              className="flex flex-wrap gap-2"
            >
              <input
                name="name"
                aria-label="Template name"
                placeholder="Template name"
                className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button className={buttonClass}>Save as template</button>
            </form>
          </div>

          <div className="mt-6 space-y-5">
            {course.modules.map((module, moduleIndex) => (
              <section
                key={module.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Module {module.order}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{module.title}</h3>
                    {module.objective && (
                      <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
                        {module.objective}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={moveModuleAction.bind(
                        null,
                        course.id,
                        module.id,
                        -1,
                      )}
                    >
                      <button
                        disabled={moduleIndex === 0}
                        className={buttonClass + " disabled:opacity-40"}
                        aria-label={"Move " + module.title + " up"}
                      >
                        ↑
                      </button>
                    </form>
                    <form
                      action={moveModuleAction.bind(
                        null,
                        course.id,
                        module.id,
                        1,
                      )}
                    >
                      <button
                        disabled={moduleIndex === course.modules.length - 1}
                        className={buttonClass + " disabled:opacity-40"}
                        aria-label={"Move " + module.title + " down"}
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                </div>

                <details className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Edit module
                  </summary>
                  <form
                    action={updateModuleAction.bind(
                      null,
                      course.id,
                      module.id,
                    )}
                    className="mt-4 grid gap-4"
                  >
                    <label className="text-sm font-medium">
                      Title
                      <input
                        name="title"
                        required
                        maxLength={200}
                        defaultValue={module.title}
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Description
                      <textarea
                        name="description"
                        rows={3}
                        maxLength={2000}
                        defaultValue={module.description ?? ""}
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Objective
                      <textarea
                        name="objective"
                        rows={3}
                        maxLength={2000}
                        defaultValue={module.objective ?? ""}
                        className={fieldClass}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button className={primaryButtonClass}>Save module</button>
                    </div>
                  </form>
                  <form
                    action={deleteModuleAction.bind(
                      null,
                      course.id,
                      module.id,
                    )}
                    className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800"
                  >
                    <button className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Delete module and its lessons
                    </button>
                  </form>
                </details>

                <div className="mt-5 space-y-3">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <article
                      key={lesson.id}
                      className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-neutral-500">
                            Lesson {lesson.order} · {lesson.status}
                          </p>
                          <h4 className="mt-1 font-semibold">{lesson.title}</h4>
                          {lesson.concepts.length > 0 && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {lesson.concepts.join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <form
                            action={moveLessonAction.bind(
                              null,
                              course.id,
                              module.id,
                              lesson.id,
                              -1,
                            )}
                          >
                            <button
                              disabled={lessonIndex === 0}
                              className={buttonClass + " disabled:opacity-40"}
                              aria-label={"Move " + lesson.title + " up"}
                            >
                              ↑
                            </button>
                          </form>
                          <form
                            action={moveLessonAction.bind(
                              null,
                              course.id,
                              module.id,
                              lesson.id,
                              1,
                            )}
                          >
                            <button
                              disabled={lessonIndex === module.lessons.length - 1}
                              className={buttonClass + " disabled:opacity-40"}
                              aria-label={"Move " + lesson.title + " down"}
                            >
                              ↓
                            </button>
                          </form>
                        </div>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                          Edit lesson
                        </summary>
                        <form
                          action={updateLessonAction.bind(
                            null,
                            course.id,
                            module.id,
                            lesson.id,
                          )}
                          className="mt-4 grid gap-4"
                        >
                          <label className="text-sm font-medium">
                            Title
                            <input
                              name="title"
                              required
                              maxLength={200}
                              defaultValue={lesson.title}
                              className={fieldClass}
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Description
                            <textarea
                              name="description"
                              rows={3}
                              maxLength={2000}
                              defaultValue={lesson.description ?? ""}
                              className={fieldClass}
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Objectives
                            <span className="mt-1 block text-xs font-normal text-neutral-500">
                              One per line or comma-separated.
                            </span>
                            <textarea
                              name="objectives"
                              rows={4}
                              defaultValue={lesson.objectives.join("\n")}
                              className={fieldClass}
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Concepts
                            <span className="mt-1 block text-xs font-normal text-neutral-500">
                              One per line or comma-separated.
                            </span>
                            <textarea
                              name="concepts"
                              rows={4}
                              defaultValue={lesson.concepts.join("\n")}
                              className={fieldClass}
                            />
                          </label>
                          <button className={primaryButtonClass}>Save lesson</button>
                        </form>
                        <form
                          action={deleteLessonAction.bind(
                            null,
                            course.id,
                            module.id,
                            lesson.id,
                          )}
                          className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800"
                        >
                          <button className="text-sm font-semibold text-red-700 dark:text-red-300">
                            Delete lesson
                          </button>
                        </form>
                      </details>
                    </article>
                  ))}

                  <details className="rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Add lesson
                    </summary>
                    <form
                      action={createLessonAction.bind(
                        null,
                        course.id,
                        module.id,
                      )}
                      className="mt-4 grid gap-4"
                    >
                      <label className="text-sm font-medium">
                        Title
                        <input name="title" required maxLength={200} className={fieldClass} />
                      </label>
                      <label className="text-sm font-medium">
                        Description
                        <textarea name="description" rows={2} maxLength={2000} className={fieldClass} />
                      </label>
                      <label className="text-sm font-medium">
                        Objectives
                        <textarea name="objectives" rows={3} className={fieldClass} />
                      </label>
                      <label className="text-sm font-medium">
                        Concepts
                        <textarea name="concepts" rows={3} className={fieldClass} />
                      </label>
                      <button className={primaryButtonClass}>Add lesson</button>
                    </form>
                  </details>
                </div>
              </section>
            ))}

            <details className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
              <summary className="cursor-pointer font-semibold">Add module</summary>
              <form
                action={createModuleAction.bind(null, course.id)}
                className="mt-4 grid gap-4"
              >
                <label className="text-sm font-medium">
                  Title
                  <input name="title" required maxLength={200} className={fieldClass} />
                </label>
                <label className="text-sm font-medium">
                  Description
                  <textarea name="description" rows={3} maxLength={2000} className={fieldClass} />
                </label>
                <label className="text-sm font-medium">
                  Objective
                  <textarea name="objective" rows={3} maxLength={2000} className={fieldClass} />
                </label>
                <button className={primaryButtonClass}>Add module</button>
              </form>
            </details>
          </div>
        </section>

        <section className="border-t border-neutral-200 py-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Course lifecycle</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <form
              action={archiveCourseAction.bind(
                null,
                course.id,
                course.status !== "ARCHIVED",
              )}
            >
              <button className={buttonClass}>
                {course.status === "ARCHIVED" ? "Restore course" : "Archive course"}
              </button>
            </form>
          </div>

          <details className="mt-6 rounded-xl border border-red-200 p-4 dark:border-red-900">
            <summary className="cursor-pointer text-sm font-semibold text-red-700 dark:text-red-300">
              Delete course
            </summary>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
              This permanently deletes the curriculum, generated lessons, quizzes,
              attempts, tutor conversations, and course memories.
            </p>
            <form action={deleteCourseAction.bind(null, course.id)} className="mt-4">
              <button className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white">
                Permanently delete
              </button>
            </form>
          </details>
        </section>
      </div>
    </main>
  );
}
