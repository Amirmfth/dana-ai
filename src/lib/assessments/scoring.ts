export function passesEvidenceThreshold(
  correct: number,
  total: number,
  threshold = 0.8,
  minimumEvidence = 2,
) {
  if (total < minimumEvidence) return false;
  return correct / total >= threshold;
}
