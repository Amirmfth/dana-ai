import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50 px-5 dark:bg-neutral-950">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-semibold">Dana AI</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Your courses, progress, conversations, and AI usage will be isolated to this account.
        </p>

        {params.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
            The account could not be created. The email may already be registered.
          </p>
        )}

        <form action={signUpAction} className="mt-7 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" autoComplete="email" required className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:focus:border-white" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:focus:border-white" />
          </label>
          <button className="min-h-11 w-full rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
            Create account
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-300">
          Already registered? <Link href="/login" className="font-semibold underline underline-offset-4">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
