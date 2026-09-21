"use client";

import { motion, useReducedMotion } from "framer-motion";

export function CompletionFeedback({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start gap-3">
        <motion.span
          initial={reduceMotion ? false : { scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 320, damping: 20 }
          }
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
          aria-hidden="true"
        >
          ✓
        </motion.span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          {description && (
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </motion.div>
  );
}
