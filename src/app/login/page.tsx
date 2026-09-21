import Link from "next/link";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/auth/actions";
import { AsyncActionForm } from "@/components/ui/async-action-form";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { getCurrentUser } from "@/lib/auth/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  if (await getCurrentUser()) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50 px-5 dark:bg-neutral-950">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-semibold">Dana AI</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Continue to your courses and tutor.
        </p>

        {params.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
            The email or password is incorrect.
          </p>
        )}
        {params.message === "check_email" && (
          <p className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
            Check your email to confirm the account, then sign in.
          </p>
        )}

        <AsyncActionForm action={signInAction} className="mt-7 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" autoComplete="email" required className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:focus:border-white" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" autoComplete="current-password" required minLength={8} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:focus:border-white" />
          </label>
          <PendingActionButton className="min-h-11 w-full rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950" pendingLabel="Signing in…" successLabel="Done" errorLabel="Try again">
            Sign in
          </PendingActionButton>
        </AsyncActionForm>

        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-300">
          No account? <Link href="/signup" className="font-semibold underline underline-offset-4">Create one</Link>
        </p>
      </section>
    </main>
  );
}
