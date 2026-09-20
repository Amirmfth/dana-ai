export const AI_PRICING_PER_MILLION = {
  "gpt-5.6-luna": { input: 0.2, cachedInput: 0.02, output: 1.2 },
  "gpt-5.6-terra": { input: 2, cachedInput: 0.2, output: 12 },
  "text-embedding-3-small": { input: 0.02, cachedInput: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, cachedInput: 0.13, output: 0 },
} as const;

export function estimateAiUsageCost(usage: {
  model: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}) {
  const pricing =
    AI_PRICING_PER_MILLION[
      usage.model as keyof typeof AI_PRICING_PER_MILLION
    ];

  if (!pricing) return 0;

  const cached = usage.cachedInputTokens ?? 0;
  const uncached = Math.max((usage.inputTokens ?? 0) - cached, 0);

  return (
    (uncached / 1_000_000) * pricing.input +
    (cached / 1_000_000) * pricing.cachedInput +
    ((usage.outputTokens ?? 0) / 1_000_000) * pricing.output
  );
}
