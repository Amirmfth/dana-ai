"use client";

import { useFormStatus } from "react-dom";

export function PendingActionButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="mr-2 inline-block size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
