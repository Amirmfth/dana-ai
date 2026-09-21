"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedProgress({
  value,
  className = "",
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();
  const bounded = Math.max(0, Math.min(100, value));

  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-neutral-500">
          <span>{label}</span>
          <span>{Math.round(bounded)}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bounded)}
        aria-label={label ?? "Progress"}
      >
        <motion.div
          className="h-full rounded-full bg-neutral-950 dark:bg-white"
          initial={false}
          animate={{ width: bounded + "%" }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: "easeOut" }
          }
        />
      </div>
    </div>
  );
}
