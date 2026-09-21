import Link from "next/link";
import { notFound } from "next/navigation";

export const maxDuration = 300;

import {
  addFileSourceAction,
  addTextSourceAction,
  addUrlSourceAction,
  deleteSourceAction,
  deleteOrphanSourceAction,
} from "@/app/courses/[courseId]/sources/actions";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { AsyncActionForm } from "@/components/ui/async-action-form";

const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950";
const buttonClass = "min-h-10 rounded-lg border border-neutral-300 px-3 text-sm font-semibold dark:border-neutral-700";

export default async function CourseSourcesPage({ params }: PageProps<"/courses/[courseId]/sources">) {
  const user = await requireUser();
  const { courseId } = await params;
  const [course, unattachedSources] = await Promise.all([
    prisma.course.findFirst({
    where: { id: courseId, ownerId: user.id },
    include: {
      sources: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { chunks: true } },
          chunks: {
            select: { _count: { select: { citations: true } } },
          },
        },
      },
    },
    }),
    prisma.courseSource.findMany({
      where: {
        ownerId: user.id,
        courseId: null,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        errorMessage: true,
        storagePath: true,
        createdAt: true,
      },
    }),
  ]);
  if (!course) notFound();

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href={"/courses/" + courseId} className="text-sm font-medium underline underline-offset-4">Back to course</Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Course sources</h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-300">Dana retrieves relevant chunks from these materials during curriculum, lesson, regeneration, and tutor work.</p>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <AsyncActionForm action={addFileSourceAction.bind(null, courseId)} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" pendingMessage="Uploading and processing source…" successMessage="Source added." errorMessage="Source upload failed.">
            <h2 className="font-semibold">Upload file</h2>
            <p className="mt-1 text-xs text-neutral-500">PDF, TXT, or Markdown · max 8 MB</p>
            <input className="mt-4 block w-full text-sm" type="file" name="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" required />
            <PendingActionButton
              className={buttonClass + " mt-4"}
              pendingLabel="Processing source…"
            >
              Add source
            </PendingActionButton>
          </AsyncActionForm>

          <AsyncActionForm action={addUrlSourceAction.bind(null, courseId)} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" pendingMessage="Fetching and processing URL…" successMessage="URL source added." errorMessage="URL source could not be added.">
            <h2 className="font-semibold">Public URL</h2>
            <label className="mt-3 block text-sm font-medium">URL<input name="url" type="url" required placeholder="https://docs.example.com/guide" className={fieldClass} /></label>
            <PendingActionButton className={buttonClass + " mt-4"} pendingLabel="Adding URL…" successLabel="Added" errorLabel="Try again">Add URL</PendingActionButton>
          </AsyncActionForm>

          <AsyncActionForm action={addTextSourceAction.bind(null, courseId)} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" pendingMessage="Processing notes…" successMessage="Notes added." errorMessage="Notes could not be added.">
            <h2 className="font-semibold">Paste notes</h2>
            <input name="title" placeholder="Notes title" className={fieldClass} />
            <textarea name="content" required rows={5} placeholder="Paste notes or course material…" className={fieldClass} />
            <PendingActionButton className={buttonClass + " mt-4"} pendingLabel="Adding notes…" successLabel="Added" errorLabel="Try again">Add notes</PendingActionButton>
          </AsyncActionForm>
        </section>

        {unattachedSources.length > 0 && (
          <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <h2 className="text-lg font-semibold">Unattached uploads</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              These came from interrupted course-creation attempts before a course could be linked. They are not used by Dana. Delete them and re-upload the source to this course.
            </p>
            <div className="mt-4 space-y-3">
              {unattachedSources.map((source) => (
                <article
                  key={source.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-neutral-950"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{source.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {source.type} · {source.status.toLowerCase()} · {source.createdAt.toLocaleString()}
                    </p>
                    {source.errorMessage && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                        {source.errorMessage}
                      </p>
                    )}
                  </div>
                  <AsyncActionForm action={deleteOrphanSourceAction.bind(null, source.id)} pendingMessage="Deleting source…" successMessage="Orphan source deleted." errorMessage="Source could not be deleted.">
                    <PendingActionButton className="text-sm font-semibold text-red-700 disabled:opacity-60 dark:text-red-300" pendingLabel="Deleting…" successLabel="Deleted" errorLabel="Try again">
                      Delete orphan
                    </PendingActionButton>
                  </AsyncActionForm>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Attached sources</h2>
          {course.sources.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No sources attached yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {course.sources.map((source) => {
                const citations = source.chunks.reduce((sum, chunk) => sum + chunk._count.citations, 0);
                return (
                  <article key={source.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div>
                      <p className="font-semibold">{source.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">{source.type} · {source.status.toLowerCase()} · {source._count.chunks} chunks · {citations} citations</p>
                      {source.originalUrl && <a href={source.originalUrl} target="_blank" rel="noreferrer" className="mt-1 block max-w-2xl truncate text-xs underline">{source.originalUrl}</a>}
                      {source.errorMessage && <p className="mt-2 text-xs text-red-600">{source.errorMessage}</p>}
                    </div>
                    {citations === 0 ? (
                      <AsyncActionForm action={deleteSourceAction.bind(null, courseId, source.id)} pendingMessage="Deleting source…" successMessage="Source deleted." errorMessage="Source could not be deleted."><PendingActionButton className="text-sm font-semibold text-red-700 disabled:opacity-60 dark:text-red-300" pendingLabel="Deleting…" successLabel="Deleted" errorLabel="Try again">Delete</PendingActionButton></AsyncActionForm>
                    ) : (
                      <span className="text-xs text-neutral-500">Preserved because lesson versions cite it</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
