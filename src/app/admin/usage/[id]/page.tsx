import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

type UsageDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function TokenStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">
        {value === null ? "—" : `${value.toLocaleString()}${suffix ?? ""}`}
      </dd>
    </div>
  );
}

function RecordField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="mt-1 break-all font-mono text-sm">{value ?? "—"}</dd>
    </div>
  );
}

function Payload({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <pre className="max-h-[36rem] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 whitespace-pre-wrap break-words">
        {formatValue(value)}
      </pre>
    </section>
  );
}

export default async function UsageDetailPage({ params }: UsageDetailPageProps) {
  const { id } = await params;
  const usage = await prisma.aiUsage.findUnique({ where: { id } });

  if (!usage) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <Link
        href="/admin/usage"
        className="text-sm font-medium text-neutral-600 underline underline-offset-4 hover:text-neutral-950"
      >
        Back to AI usage
      </Link>

      <header className="mt-6 mb-10">
        <p className="mb-2 text-sm font-medium text-neutral-500">Dana AI · Admin</p>
        <h1 className="text-4xl font-semibold tracking-tight">Usage request</h1>
        <p className="mt-3 break-all font-mono text-sm text-neutral-500">{usage.id}</p>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TokenStat label="Input tokens" value={usage.inputTokens} />
        <TokenStat label="Output tokens" value={usage.outputTokens} />
        <TokenStat label="Total tokens" value={usage.totalTokens} />
        <TokenStat label="Cached input" value={usage.cachedInputTokens} />
        <TokenStat label="Reasoning tokens" value={usage.reasoningTokens} />
        <TokenStat label="Duration" value={usage.durationMs} suffix=" ms" />
      </section>

      <section className="mb-10 rounded-2xl border border-neutral-200 p-6">
        <h2 className="mb-5 text-lg font-semibold">Request metadata</h2>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <RecordField label="Operation" value={usage.operation} />
          <RecordField label="Status" value={usage.status} />
          <RecordField label="Model" value={usage.model} />
          <RecordField label="Created" value={usage.createdAt.toLocaleString()} />
          <RecordField label="OpenAI request / response ID" value={usage.providerResponseId} />
          <RecordField label="Course ID" value={usage.courseId} />
          <RecordField label="Lesson ID" value={usage.lessonId} />
          <RecordField label="Conversation ID" value={usage.conversationId} />
          <RecordField label="Error" value={usage.errorMessage} />
        </dl>
      </section>

      <div className="space-y-10">
        <Payload title="Exact request input" value={usage.input} />
        <Payload title="Response output" value={usage.output} />
      </div>
    </main>
  );
}
