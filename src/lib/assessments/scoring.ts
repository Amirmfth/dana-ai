export function passesEvidenceThreshold(
  correct: number,
  total: number,
  threshold = 0.8,
) {
  if (total <= 0) return false;
  return correct / total >= threshold;
}
