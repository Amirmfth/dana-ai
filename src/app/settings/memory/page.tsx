import Link from "next/link";

import {
  clearMemoriesAction,
  deleteMemoryAction,
  toggleMemoryAction,
  updateMemoryAction,
} from "@/app/settings/memory/actions";
import { getPrivacySettings } from "@/lib/ai/privacy";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { PendingActionButton } from "@/components/ui/pending-action-button";

const fieldClass =
  "mt-2 min-h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

export default async function MemorySettingsPage() {
  const user = await requireUser();
  const [settings, memories] = await Promise.all([
    getPrivacySettings(user.id),
    prisma.courseMemory.findMany({
      where: { course: { ownerId: user.id } },
      orderBy: [{ updatedAt: "desc" }, { importance: "desc" }],
      include: {
        course: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
      },
    }),
  ]);

  const activeCount = memories.filter((memory) => memory.isActive).length;

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          Back to Dana
        </Link>
        <Link href="/settings/privacy" className="text-sm font-medium underline underline-offset-4">
          Privacy settings
        </Link>
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">
        Learner memory
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-neutral-600 dark:text-neutral-300">
        These are durable observations Dana may use to personalize future
        teaching. You can edit, deactivate, or delete any memory.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p className="font-semibold">
          Memory use is {settings.useLearnerMemory ? "enabled" : "disabled"}
        </p>
        <p className="mt-1 text-neutral-500">
          {activeCount} active of {memories.length} stored memories.
          {settings.useLearnerMemory
            ? " Active memories can be used in tutoring and lesson context."
            : " Existing memories remain stored but Dana will not use or create them."}
        </p>
      </div>

      {memories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-8 text-neutral-500 dark:border-neutral-700">
          Dana has not stored any learner memories yet.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {memories.map((memory) => (
            <article
              key={memory.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{memory.course.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {memory.lesson ? memory.lesson.title + " · " : ""}
                    Updated {memory.updatedAt.toLocaleString()}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-semibold " +
                    (memory.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")
                  }
                >
                  {memory.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <AsyncActionForm
                action={updateMemoryAction.bind(null, memory.id)}
                className="space-y-4"
                pendingMessage="Updating memory…"
                successMessage="Memory updated."
                errorMessage="Memory could not be updated."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Type
                    <select name="type" defaultValue={memory.type} className={fieldClass}>
                      <option value="MISCONCEPTION">Misconception</option>
                      <option value="WEAKNESS">Weakness</option>
                      <option value="STRENGTH">Strength</option>
                      <option value="PREFERENCE">Preference</option>
                      <option value="LEARNING_NOTE">Learning note</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Importance
                    <select
                      name="importance"
                      defaultValue={String(memory.importance)}
                      className={fieldClass}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Memory
                  <textarea
                    name="content"
                    defaultValue={memory.content}
                    rows={3}
                    maxLength={1000}
                    className={fieldClass}
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={memory.isActive}
                  />
                  Allow Dana to use this memory
                </label>

                <div className="flex flex-wrap gap-3">
                  <PendingActionButton
                    className="min-h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950"
                    pendingLabel="Saving…"
                    successLabel="Saved"
                    errorLabel="Try again"
                  >
                    Save changes
                  </PendingActionButton>
                  <PendingActionButton
                    formAction={toggleMemoryAction.bind(null, memory.id, !memory.isActive)}
                    className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
                    pendingLabel={memory.isActive ? "Deactivating…" : "Activating…"}
                    successLabel={memory.isActive ? "Deactivated" : "Activated"}
                    errorLabel="Try again"
                    successMessage={memory.isActive ? "Memory deactivated." : "Memory activated."}
                    errorMessage="Memory state could not be changed."
                  >
                    {memory.isActive ? "Deactivate" : "Activate"}
                  </PendingActionButton>
                  <PendingActionButton
                    formAction={deleteMemoryAction.bind(null, memory.id)}
                    className="min-h-10 rounded-lg px-4 text-sm font-semibold text-red-700 disabled:opacity-60 dark:text-red-300"
                    pendingLabel="Deleting…"
                    successLabel="Deleted"
                    errorLabel="Try again"
                    successMessage="Memory deleted."
                    errorMessage="Memory could not be deleted."
                  >
                    Delete
                  </PendingActionButton>
                </div>
              </AsyncActionForm>
            </article>
          ))}
        </div>
      )}

      {memories.length > 0 && (
        <section className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Delete all learner memories</h2>
          <p className="mt-2 text-sm text-neutral-500">
            This permanently removes every learner memory across your courses.
          </p>
          <AsyncActionForm action={clearMemoriesAction} className="mt-4" pendingMessage="Deleting all learner memories…" successMessage="All learner memories deleted." errorMessage="Learner memories could not be deleted.">
            <PendingActionButton className="min-h-10 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-60 dark:border-red-900 dark:text-red-300" pendingLabel="Deleting…" successLabel="Deleted" errorLabel="Try again">
              Delete all memories
            </PendingActionButton>
          </AsyncActionForm>
        </section>
      )}
    </main>
  );
}
