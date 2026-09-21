import Link from "next/link";

import {
  createCourseFromTemplateAction,
  deleteTemplateAction,
  importCourseAction,
} from "@/app/courses/[courseId]/manage/actions";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { AsyncActionForm } from "@/components/ui/async-action-form";

export default async function TemplatesPage() {
  const user = await requireUser();
  const templates = await prisma.courseTemplate.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          Back to courses
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Templates and import
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Templates contain curriculum structure only. Progress, generated lesson
          bodies, conversations, memories, and quiz attempts are never copied.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Saved templates</h2>
          {templates.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500 dark:border-neutral-700">
              Save a course as a template from its Manage screen.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    {template.description && (
                      <p className="mt-1 text-sm text-neutral-500">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <AsyncActionForm action={createCourseFromTemplateAction.bind(null, template.id)}>
                      <button className="min-h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
                        Create course
                      </button>
                    </AsyncActionForm>
                    <AsyncActionForm action={deleteTemplateAction.bind(null, template.id)}>
                      <button className="min-h-10 rounded-lg border border-neutral-300 px-3 text-sm font-semibold dark:border-neutral-700">
                        Delete
                      </button>
                    </AsyncActionForm>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Import curriculum JSON</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Paste a Dana curriculum export. The structure is validated before any
            course is created.
          </p>
          <AsyncActionForm action={importCourseAction} className="mt-4">
            <textarea
              name="structure"
              required
              rows={16}
              placeholder='{"version":1,"course":{...}}'
              className="w-full rounded-xl border border-neutral-300 bg-white p-4 font-mono text-sm outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
            />
            <button className="mt-3 min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
              Import as new course
            </button>
          </AsyncActionForm>
        </section>
      </div>
    </main>
  );
}
