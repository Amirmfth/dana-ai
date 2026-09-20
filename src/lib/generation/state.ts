export type GenerationStatusValue =
  | "NOT_STARTED"
  | "GENERATING"
  | "READY"
  | "FAILED";

export const GENERATION_STALE_AFTER_MS = 10 * 60 * 1000;
export const GENERATION_WAIT_TIMEOUT_MS = 20 * 1000;

export function isGenerationStale(
  status: GenerationStatusValue,
  startedAt: Date | null,
  now = new Date(),
) {
  if (status !== "GENERATING" || !startedAt) {
    return false;
  }

  return now.getTime() - startedAt.getTime() >= GENERATION_STALE_AFTER_MS;
}

export function canClaimGeneration(
  status: GenerationStatusValue,
  startedAt: Date | null,
  now = new Date(),
) {
  return (
    status === "NOT_STARTED" ||
    status === "FAILED" ||
    isGenerationStale(status, startedAt, now)
  );
}

export function safeGenerationError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown generation error";

  return message.slice(0, 2000);
}
