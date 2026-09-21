"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

export type AsyncActionStatus = "idle" | "pending" | "success" | "error";

type ServerAction = (...args: never[]) => Promise<unknown>;

type ActionState = {
  status: AsyncActionStatus;
  message: string | null;
};

type AsyncActionContextValue = {
  state: ActionState;
  isPending: boolean;
  runAction: (
    action: ServerAction,
    formData: FormData,
    options?: {
      successMessage?: string;
      errorMessage?: string;
    },
  ) => Promise<void>;
};

const AsyncActionContext = createContext<AsyncActionContextValue | null>(null);

function redirectDigest(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && error.message !== "Failed to execute server action.") {
    return error.message;
  }

  return fallback;
}

export function AsyncActionForm({
  action,
  children,
  className,
  successMessage = "Done",
  errorMessage: fallbackErrorMessage = "Something went wrong. Please try again.",
  successDurationMs = 2500,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  errorMessage?: string;
  successDurationMs?: number;
}) {
  const [state, setState] = useState<ActionState>({
    status: "idle",
    message: null,
  });
  const [isPending, startTransition] = useTransition();
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      setState({ status: "pending", message: null });

      await new Promise<void>((resolve, reject) => {
        startTransition(async () => {
          try {
            await targetAction(formData as never);
            const message = options?.successMessage ?? successMessage;
            setState({ status: "success", message });

            if (successDurationMs > 0) {
              successTimer.current = setTimeout(() => {
                setState({ status: "idle", message: null });
              }, successDurationMs);
            }

            resolve();
          } catch (error) {
            if (redirectDigest(error)) {
              reject(error);
              return;
            }

            setState({
              status: "error",
              message: errorMessage(
                error,
                options?.errorMessage ?? fallbackErrorMessage,
              ),
            });
            resolve();
          }
        });
      });
    },
    [
      fallbackErrorMessage,
      isPending,
      startTransition,
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
        {children}
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
  if (!context || context.state.status === "idle" || context.state.status === "pending") {
    return (
      <span className="sr-only" aria-live="polite">
        {context?.state.status === "pending" ? "Action in progress" : ""}
      </span>
    );
  }

  const isSuccess = context.state.status === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={
        "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm " +
        (isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200")
      }
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 font-semibold">
        {isSuccess ? "✓" : "!"}
      </span>
      <span>{context.state.message}</span>
    </div>
  );
}
