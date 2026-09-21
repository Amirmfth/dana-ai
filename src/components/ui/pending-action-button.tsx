"use client";

import { useFormStatus } from "react-dom";

import {
  useAsyncActionContext,
  type FormAction,
} from "@/components/ui/async-action-form";

export function PendingActionButton({
  children,
  pendingLabel,
  successLabel = "Done",
  errorLabel = "Try again",
  className,
  disabled,
  formAction,
  successMessage,
  errorMessage,
  type = "submit",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  successLabel?: string;
  errorLabel?: string;
  className: string;
  disabled?: boolean;
  formAction?: FormAction;
  successMessage?: string;
  errorMessage?: string;
  type?: "submit" | "button";
}) {
  const { pending: formPending } = useFormStatus();
  const asyncContext = useAsyncActionContext();
  const pending = formPending || Boolean(asyncContext?.isPending);
  const status = asyncContext?.state.status ?? "idle";

  const wrappedFormAction =
    formAction && asyncContext
      ? async (formData: FormData) => {
          await asyncContext.runAction(formAction, formData, {
            successMessage,
            errorMessage,
          });
        }
      : formAction;

  const label =
    pending
      ? pendingLabel
      : status === "success"
        ? successLabel
        : status === "error"
          ? errorLabel
          : children;

  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      formAction={wrappedFormAction}
      className={className}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="mr-2 inline-block size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      {!pending && status === "success" && (
        <span aria-hidden="true" className="mr-2">
          ✓
        </span>
      )}
      {!pending && status === "error" && (
        <span aria-hidden="true" className="mr-2">
          !
        </span>
      )}
      {label}
    </button>
  );
}
