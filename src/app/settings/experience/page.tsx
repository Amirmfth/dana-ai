import Link from "next/link";

import { updateExperienceSettingsAction } from "@/app/settings/experience/actions";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export default async function ExperienceSettingsPage() {
  const user = await requireUser();
  const settings = await prisma.userExperienceSettings.findUnique({
    where: { userId: user.id },
  });

  const value = {
    uiLanguage: settings?.uiLanguage ?? "English",
    defaultContentLanguage: settings?.defaultContentLanguage ?? "English",
    tutorLanguage: settings?.tutorLanguage ?? "English",
    fontSize: settings?.fontSize ?? "DEFAULT",
    lineHeight: settings?.lineHeight ?? "NORMAL",
    readingWidth: settings?.readingWidth ?? "STANDARD",
    readingDensity: settings?.readingDensity ?? "COMFORTABLE",
    motionPreference: settings?.motionPreference ?? "SYSTEM",
    highContrast: settings?.highContrast ?? false,
    dyslexiaFriendly: settings?.dyslexiaFriendly ?? false,
  };

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-12 sm:px-8">
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Back to Dana
      </Link>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">
        Language & reading
      </h1>
      <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-300">
        Keep interface language, course teaching language, and tutor response language independent. Reading preferences are applied to lesson pages.
      </p>

      <AsyncActionForm
        action={updateExperienceSettingsAction}
        className="mt-8 space-y-8"
        pendingMessage="Saving language and reading settings…"
        successMessage="Language and reading settings saved."
        errorMessage="Language and reading settings could not be saved."
      >
        <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Languages</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <LanguageField name="uiLanguage" label="UI language" value={value.uiLanguage} note="Stored independently from course and tutor language." />
            <LanguageField name="defaultContentLanguage" label="Default course language" value={value.defaultContentLanguage} note="Your preferred language for newly created courses." />
            <LanguageField name="tutorLanguage" label="Tutor response language" value={value.tutorLanguage} note="Dana uses this unless you explicitly request another language." />
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Reading & accessibility</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SelectField name="fontSize" label="Font size" value={value.fontSize} options={[["SMALL","Small"],["DEFAULT","Default"],["LARGE","Large"],["EXTRA_LARGE","Extra large"]]} />
            <SelectField name="lineHeight" label="Line height" value={value.lineHeight} options={[["TIGHT","Tight"],["NORMAL","Normal"],["RELAXED","Relaxed"]]} />
            <SelectField name="readingWidth" label="Reading width" value={value.readingWidth} options={[["NARROW","Narrow"],["STANDARD","Standard"],["WIDE","Wide"]]} />
            <SelectField name="readingDensity" label="Reading density" value={value.readingDensity} options={[["COMPACT","Compact"],["COMFORTABLE","Comfortable"],["SPACIOUS","Spacious"]]} />
            <SelectField name="motionPreference" label="Motion" value={value.motionPreference} options={[["SYSTEM","Follow system"],["REDUCED","Reduce motion"],["FULL","Allow motion"]]} />
          </div>
          <div className="mt-6 space-y-4">
            <Check name="highContrast" label="Higher contrast" checked={value.highContrast} />
            <Check name="dyslexiaFriendly" label="Dyslexia-friendly font stack" checked={value.dyslexiaFriendly} />
          </div>
        </section>

        <PendingActionButton
          className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950"
          pendingLabel="Saving…"
          successLabel="Saved"
          errorLabel="Try again"
        >
          Save language & reading settings
        </PendingActionButton>
      </AsyncActionForm>
    </main>
  );
}

function LanguageField({ name, label, value, note }: { name: string; label: string; value: string; note: string }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input name={name} defaultValue={value} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 dark:border-neutral-700" />
      <span className="mt-1 block text-xs font-normal leading-5 text-neutral-500">{note}</span>
    </label>
  );
}

function SelectField({ name, label, value, options }: { name: string; label: string; value: string; options: Array<[string, string]> }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select name={name} defaultValue={value} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 dark:border-neutral-700">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-4" />
      {label}
    </label>
  );
}
