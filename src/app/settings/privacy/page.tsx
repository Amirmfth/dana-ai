import Link from "next/link";

import { updatePrivacySettingsAction } from "@/app/settings/privacy/actions";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { getPrivacySettings } from "@/lib/ai/privacy";
import { requireUser } from "@/lib/auth/server";

export default async function PrivacySettingsPage() {
  const user = await requireUser();
  const settings = await getPrivacySettings(user.id);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-12 sm:px-8">
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Back to Dana
      </Link>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">
        AI data privacy
      </h1>
      <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
        Dana always keeps operational usage metadata such as model, token count,
        duration, and status. Exact AI request payloads and generated outputs are
        stored only when you opt in below.
      </p>

      <AsyncActionForm
        action={updatePrivacySettingsAction}
        className="mt-8 space-y-6 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
        pendingMessage="Saving privacy settings…"
        successMessage="Privacy settings saved."
        errorMessage="Privacy settings could not be saved."
      >
        <label className="flex items-start gap-3">
          <input
            name="storeAiPayloads"
            type="checkbox"
            defaultChecked={settings.storeAiPayloads}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-semibold">Store AI request and response payloads</span>
            <span className="mt-1 block text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Useful for debugging and reviewing generations. Disabled by default.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            name="useLearnerMemory"
            type="checkbox"
            defaultChecked={settings.useLearnerMemory}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-semibold">Use learner memory</span>
            <span className="mt-1 block text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Allow Dana to save durable learning observations and use active memories to personalize future teaching. Turning this off keeps existing memories stored but stops using or creating them.
            </span>
          </span>
        </label>

        <label className="block text-sm font-medium">
          Payload retention
          <select
            name="retentionDays"
            defaultValue={String(settings.retentionDays)}
            className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>

        <PendingActionButton
          className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950"
          pendingLabel="Saving…"
          successLabel="Saved"
          errorLabel="Try again"
        >
          Save privacy settings
        </PendingActionButton>
      </AsyncActionForm>
    </main>
  );
}
