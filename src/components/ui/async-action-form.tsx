"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

export type AsyncActionStatus = "idle" | "pending" | "success" | "error";
export type FormAction = (formData: FormData) => Promise<unknown>;

type ActionState = {
  status: AsyncActionStatus;
  message: string | null;
};

type AsyncActionContextValue = {
  state: ActionState;
  isPending: boolean;
  runAction: (
    action: FormAction,
    formData: FormData,
    options?: {
      successMessage?: string;
      errorMessage?: string;
    },
  ) => Promise<void>;
};

const AsyncActionContext = createContext<AsyncActionContextValue | null>(null);

function isRedirectError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    error.message &&
    error.message !== "Failed to execute server action."
  ) {
    return error.message;
  }

  return fallback;
}

export function AsyncActionForm({
  action,
  children,
  className,
  successMessage = "Done",
  pendingMessage = "Working…",
  errorMessage: fallbackErrorMessage = "Something went wrong. Please try again.",
  successDurationMs = 2500,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  pendingMessage?: string;
  errorMessage?: string;
  successDurationMs?: number;
}) {
  const [state, setState] = useState<ActionState>({
    status: "idle",
    message: null,
  });
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPending = state.status === "pending";

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const runAction = useCallback<AsyncActionContextValue["runAction"]>(
    async (targetAction, formData, options) => {
      if (isPending) return;

      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }

      setState({ status: "pending", message: pendingMessage });

      try {
        await targetAction(formData);

        const message = options?.successMessage ?? successMessage;
        setState({ status: "success", message });

        if (successDurationMs > 0) {
          successTimer.current = setTimeout(() => {
            setState({ status: "idle", message: null });
          }, successDurationMs);
        }
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }

        setState({
          status: "error",
          message: getErrorMessage(
            error,
            options?.errorMessage ?? fallbackErrorMessage,
          ),
        });
      }
    },
    [
      fallbackErrorMessage,
      isPending,
      pendingMessage,
      successDurationMs,
      successMessage,
    ],
  );

  async function formAction(formData: FormData) {
    await runAction(action, formData);
  }

  function preventDuplicateSubmit(event: FormEvent<HTMLFormElement>) {
    if (isPending) event.preventDefault();
  }

  return (
    <AsyncActionContext.Provider value={{ state, isPending, runAction }}>
      <form
        action={formAction}
        onSubmit={preventDuplicateSubmit}
        className={className}
        aria-busy={isPending}
        data-action-status={state.status}
      >
        <fieldset disabled={isPending} className="contents">
          {children}
        </fieldset>
        <AsyncActionFeedback />
      </form>
    </AsyncActionContext.Provider>
  );
}

export function useAsyncActionContext() {
  return useContext(AsyncActionContext);
}

function AsyncActionFeedback() {
  const context = useAsyncActionContext();
  if (!context || context.state.status === "idle") return null;

  const { status, message } = context.state;
  const isPending = status === "pending";
  const isSuccess = status === "success";

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      aria-live={status === "error" ? "assertive" : "polite"}
      className={
        "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm " +
        (isPending
          ? "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          : isSuccess
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200")
      }
    >
      {isPending ? (
        <span
          aria-hidden="true"
          className="mt-0.5 inline-block size-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      ) : (
        <span aria-hidden="true" className="shrink-0 font-semibold">
          {isSuccess ? "✓" : "!"}
        </span>
      )}
      <span>{message}</span>
    </div>
  );
}
