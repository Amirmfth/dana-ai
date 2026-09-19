import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

const COST_PER_MILLION_TOKENS = {
  "gpt-5.6-luna": { input: 0.2, cachedInput: 0.02, output: 1.2 },
  "gpt-5.6-terra": { input: 2, cachedInput: 0.2, output: 12 },
} as const;

type PricedUsage = {
  model: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
};

function calculateCost(usage: PricedUsage) {
  const pricing =
    COST_PER_MILLION_TOKENS[
      usage.model as keyof typeof COST_PER_MILLION_TOKENS
    ];

  if (!pricing) return null;

  const cachedInputTokens = usage.cachedInputTokens ?? 0;
  const uncachedInputTokens = Math.max(
    (usage.inputTokens ?? 0) - cachedInputTokens,
    0,
  );

  return (
    (uncachedInputTokens / 1_000_000) * pricing.input +
    (cachedInputTokens / 1_000_000) * pricing.cachedInput +
    ((usage.outputTokens ?? 0) / 1_000_000) * pricing.output
  );
}

function formatCost(cost: number | null) {
  if (cost === null) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(cost);
}

export default async function UsagePage() {
  const usage = await prisma.aiUsage.findMany({
    orderBy: {
      createdAt: "desc",
    },

    take: 100,
  });

  const totals = usage.reduce(
    (acc, item) => {
      acc.requests += 1;
      acc.inputTokens += item.inputTokens ?? 0;
      acc.outputTokens += item.outputTokens ?? 0;
      acc.totalTokens += item.totalTokens ?? 0;
      acc.cachedInputTokens += item.cachedInputTokens ?? 0;

      const cost = calculateCost(item);

      if (cost !== null) {
        acc.cost += cost;
      }

      return acc;
    },
    {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
      cost: 0,
    },
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16">
      <header className="mb-10">
        <p className="mb-2 text-sm font-medium text-neutral-500">
          Dana AI · Admin
        </p>

        <h1 className="text-4xl font-semibold tracking-tight">
          AI Usage
        </h1>
      </header>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Requests"
          value={totals.requests.toLocaleString()}
        />

        <Stat
          label="Input tokens"
          value={totals.inputTokens.toLocaleString()}
        />

        <Stat
          label="Output tokens"
          value={totals.outputTokens.toLocaleString()}
        />

        <Stat
          label="Total tokens"
          value={totals.totalTokens.toLocaleString()}
        />

        <Stat label="Estimated cost" value={formatCost(totals.cost)} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="p-4">Time</th>
              <th className="p-4">Operation</th>
              <th className="p-4">Model</th>
              <th className="p-4 text-right">
                Input
              </th>
              <th className="p-4 text-right">
                Output
              </th>
              <th className="p-4 text-right">
                Total
              </th>
              <th className="p-4 text-right">
                Cached
              </th>
              <th className="p-4 text-right">
                Reasoning
              </th>
              <th className="p-4 text-right">Cost</th>
              <th className="p-4 text-right">
                Duration
              </th>
              <th className="p-4">Status</th>
              <th className="p-4"><span className="sr-only">Inspect</span></th>
            </tr>
          </thead>

          <tbody>
            {usage.map((item) => (
              <tr
                key={item.id}
                className="border-b border-neutral-100 last:border-b-0"
              >
                <td className="whitespace-nowrap p-4 text-neutral-500">
                  {item.createdAt.toLocaleString()}
                </td>

                <td className="p-4 font-medium">
                  {item.operation}
                </td>

                <td className="whitespace-nowrap p-4">
                  {item.model}
                </td>

                <td className="p-4 text-right">
                  {item.inputTokens?.toLocaleString() ??
                    "—"}
                </td>

                <td className="p-4 text-right">
                  {item.outputTokens?.toLocaleString() ??
                    "—"}
                </td>

                <td className="p-4 text-right font-medium">
                  {item.totalTokens?.toLocaleString() ??
                    "—"}
                </td>

                <td className="p-4 text-right">
                  {item.cachedInputTokens?.toLocaleString() ??
                    "—"}
                </td>

                <td className="p-4 text-right">
                  {item.reasoningTokens?.toLocaleString() ??
                    "—"}
                </td>

                <td className="whitespace-nowrap p-4 text-right font-medium">
                  {formatCost(calculateCost(item))}
                </td>

                <td className="p-4 text-right">
                  {item.durationMs
                    ? `${item.durationMs} ms`
                    : "—"}
                </td>

                <td className="p-4">
                  {item.status}
                </td>

                <td className="p-4 text-right">
                  <Link
                    href={`/admin/usage/${item.id}`}
                    className="font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-950"
                  >
                    Inspect
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Cost uses standard text-token pricing and treats cached tokens as part of
        the reported input total. Tool fees, cache writes, and long-context
        pricing are not included.
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <p className="mb-2 text-sm text-neutral-500">
        {label}
      </p>

      <p className="text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}
