export type ConceptBand = "STRENGTH" | "DEVELOPING" | "WEAKNESS";

export function conceptBand(correct: number, attempts: number): ConceptBand {
  if (attempts <= 0) return "DEVELOPING";

  const rate = correct / attempts;
  if (rate >= 0.75) return "STRENGTH";
  if (rate >= 0.5) return "DEVELOPING";
  return "WEAKNESS";
}

export function progressPercent(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function formatDurationMinutes(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return minutes + " min";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? hours + "h " + remainder + "m" : hours + "h";
}

export function formatStudySeconds(totalSeconds: number) {
  return formatDurationMinutes(Math.round(Math.max(0, totalSeconds) / 60));
}
