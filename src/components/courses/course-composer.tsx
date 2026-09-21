"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createCourseDraftAction } from "@/app/actions/courses";

type AttachmentMode = "file" | "url" | "notes" | null;

export function CourseComposer({
  defaultContentLanguage,
}: {
  defaultContentLanguage: string;
}) {
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(null);
  const [fileKey, setFileKey] = useState(0);
  const [fileName, setFileName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasAttachments = Boolean(fileName || sourceUrl.trim() || sourceText.trim());

  function removeFile() {
    setFileName("");
    setFileKey((value) => value + 1);
  }

  function clearUrl() {
    setSourceUrl("");
    if (attachmentMode === "url") setAttachmentMode(null);
  }

  function clearNotes() {
    setSourceTitle("");
    setSourceText("");
    if (attachmentMode === "notes") setAttachmentMode(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    setSubmitError(null);

    startTransition(async () => {
      try {
        const result = await createCourseDraftAction(formData);
        router.push("/courses/" + result.courseId + "/generating");
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Course setup failed. Please review your inputs and try again.",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl"
      aria-busy={isPending}
    >
      <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm transition focus-within:border-neutral-400 focus-within:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-600">
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            {fileName && (
              <AttachmentChip label={fileName} type="File" onRemove={removeFile} />
            )}
            {sourceUrl.trim() && (
              <AttachmentChip label={sourceUrl.trim()} type="URL" onRemove={clearUrl} />
            )}
            {sourceText.trim() && (
              <AttachmentChip
                label={sourceTitle.trim() || "Pasted notes"}
                type="Notes"
                onRemove={clearNotes}
              />
            )}
          </div>
        )}

        {attachmentMode === "url" && (
          <div className="border-b border-neutral-100 px-4 py-4 dark:border-neutral-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Attach public URL
              <input
                name="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://docs.example.com/guide"
                className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
          </div>
        )}

        {attachmentMode === "notes" && (
          <div className="grid gap-3 border-b border-neutral-100 px-4 py-4 dark:border-neutral-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Notes title
              <input
                name="sourceTitle"
                value={sourceTitle}
                onChange={(event) => setSourceTitle(event.target.value)}
                placeholder="My study notes"
                className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm normal-case tracking-normal outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Notes
              <textarea
                name="sourceText"
                rows={4}
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Paste notes or reference material…"
                className="mt-2 w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm normal-case tracking-normal outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
          </div>
        )}

        <textarea
          id="learning-goal"
          name="prompt"
          required
          minLength={10}
          rows={5}
          aria-describedby="learning-goal-help"
          placeholder="What do you want to learn? For example: Teach me German from B1 to B2 with practical conversation, grammar, and writing."
          className="min-h-36 w-full resize-none bg-transparent px-5 pb-3 pt-5 text-base leading-7 text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-neutral-50 dark:placeholder:text-neutral-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
          <div className="relative flex items-center gap-2">
            <details className="relative">
              <summary
                aria-label="Attach source"
                className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 [&::-webkit-details-marker]:hidden"
              >
                +
              </summary>
              <div className="absolute bottom-12 left-0 z-20 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => setAttachmentMode("file")}
                  className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentMode("url")}
                  className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Attach URL
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentMode("notes")}
                  className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Paste notes
                </button>
              </div>
            </details>

            <details>
              <summary className="cursor-pointer list-none rounded-full border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 [&::-webkit-details-marker]:hidden">
                Course options
              </summary>
              <div className="absolute left-4 right-4 z-10 mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 sm:left-auto sm:right-auto sm:w-[34rem]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <OptionSelect name="currentLevel" label="Current level" defaultValue="BEGINNER" options={[["BEGINNER","Beginner"],["INTERMEDIATE","Intermediate"],["ADVANCED","Advanced"],["EXPERT","Expert"]]} />
                  <OptionSelect name="targetLevel" label="Target level" defaultValue="INTERMEDIATE" options={[["BEGINNER","Beginner"],["INTERMEDIATE","Intermediate"],["ADVANCED","Advanced"],["EXPERT","Expert"]]} />
                  <OptionSelect name="weeklyStudyMinutes" label="Weekly study time" defaultValue="300" options={[["120","2 hours / week"],["300","5 hours / week"],["600","10 hours / week"],["900","15 hours / week"]]} />
                  <OptionSelect name="learningStyle" label="Learning style" defaultValue="BALANCED" options={[["BALANCED","Balanced"],["PRACTICAL","Practical"],["CONCEPTUAL","Conceptual"],["PROJECT_BASED","Project-based"]]} />
                  <OptionSelect name="courseMode" label="Course mode" defaultValue="GUIDED" options={[["GUIDED","Guided · quizzes, assessments, progression"],["FLEXIBLE","Flexible · no quizzes or tests, all lessons unlocked"]]} />
                  <label className="text-sm font-medium sm:col-span-2">
                    Course teaching language
                    <input
                      name="contentLanguage"
                      defaultValue={defaultContentLanguage}
                      className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
                    />
                  </label>
                </div>
              </div>
            </details>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-11 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            {isPending && (
              <span aria-hidden="true" className="mr-2 inline-block size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
            )}
            {isPending ? "Preparing…" : "Create course"}
          </button>
        </div>
      </div>

      <div className={(attachmentMode === "file" ? "block" : "hidden") + " mt-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Upload source</p>
              <p className="mt-1 text-xs text-neutral-500">PDF, TXT, or Markdown · max 8 MB</p>
            </div>
            <button type="button" onClick={() => setAttachmentMode(null)} className="text-sm font-medium text-neutral-500">
              Close
            </button>
          </div>
          <input
            key={fileKey}
            type="file"
            name="sourceFile"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            onChange={(event) => {
              setFileName(event.target.files?.[0]?.name ?? "");
              setAttachmentMode(null);
            }}
            className="mt-4 block w-full text-sm"
          />
        </div>

      {attachmentMode !== "url" && <input type="hidden" name="sourceUrl" value={sourceUrl} />}
      {attachmentMode !== "notes" && (
        <>
          <input type="hidden" name="sourceTitle" value={sourceTitle} />
          <input type="hidden" name="sourceText" value={sourceText} />
        </>
      )}

      {submitError && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {submitError}
        </div>
      )}

      <p id="learning-goal-help" className="mt-3 text-center text-xs leading-5 text-neutral-500">
        Describe the outcome you want. Sources and detailed preferences are optional.
      </p>
    </form>
  );
}

function AttachmentChip({
  type,
  label,
  onRemove,
}: {
  type: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 py-1.5 pl-3 pr-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-950">
      <span className="font-semibold text-neutral-500">{type}</span>
      <span className="max-w-52 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={"Remove " + type + " source"}
        className="flex size-6 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
      >
        ×
      </button>
    </span>
  );
}

function OptionSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </label>
  );
}
