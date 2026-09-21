import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function UserMenu({
  courseId,
}: {
  courseId?: string;
}) {
  return (
    <details className="relative">
      <summary
        aria-label="Open user menu"
        className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:outline-white [&::-webkit-details-marker]:hidden"
      >
        <UserIcon />
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        {courseId && (
          <>
            <MenuLink href={"/courses/" + courseId + "/tutor"}>Ask Dana</MenuLink>
            <MenuLink href={"/courses/" + courseId + "/sources"}>Sources</MenuLink>
            <MenuLink href={"/courses/" + courseId + "/assessments"}>Assessments</MenuLink>
            <MenuLink href={"/courses/" + courseId + "/placement"}>Placement</MenuLink>
            <MenuLink href={"/courses/" + courseId + "/analytics"}>Analytics</MenuLink>
            <MenuLink href={"/courses/" + courseId + "/manage"}>Manage course</MenuLink>
            <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
          </>
        )}

        <MenuLink href="/search">Search</MenuLink>
        <MenuLink href="/settings/memory">Memory</MenuLink>
        <MenuLink href="/settings/experience">Language & reading</MenuLink>
        <MenuLink href="/templates">Templates</MenuLink>
        <MenuLink href="/settings/privacy">Privacy</MenuLink>

        <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />

        <div className="px-2 py-1">
          <ThemeToggle />
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:outline-white"
    >
      {children}
    </Link>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path
        d="M5.5 20c.7-3.4 3-5.25 6.5-5.25s5.8 1.85 6.5 5.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
