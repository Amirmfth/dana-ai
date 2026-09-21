import type { LessonDiagram } from "@/lib/diagrams/diagram";
import {
  isLinearDiagram,
  validDiagramEdges,
} from "@/lib/diagrams/diagram";

export function LessonDiagramView({
  diagram,
}: {
  diagram: LessonDiagram;
}) {
  const edges = validDiagramEdges(diagram);
  const linear =
    (diagram.diagramType === "FLOW" ||
      diagram.diagramType === "SEQUENCE") &&
    isLinearDiagram(diagram);

  return (
    <figure className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
      {diagram.title && (
        <h3 className="text-lg font-semibold tracking-tight">
          {diagram.title}
        </h3>
      )}

      {linear ? (
        <div
          className={
            "mt-5 flex gap-3 " +
            (diagram.direction === "HORIZONTAL"
              ? "flex-col sm:flex-row sm:items-stretch"
              : "flex-col")
          }
        >
          {diagram.nodes.map((node, index) => {
            const next = diagram.nodes[index + 1];
            const edge = next
              ? edges.find(
                  (item) =>
                    item.from === node.id && item.to === next.id,
                )
              : null;

            return (
              <div
                key={node.id}
                className={
                  diagram.direction === "HORIZONTAL"
                    ? "contents sm:flex sm:flex-1 sm:items-center sm:gap-3"
                    : "contents"
                }
              >
                <DiagramNode
                  label={node.label}
                  detail={node.detail}
                  group={node.group}
                />
                {next && (
                  <div
                    className={
                      "flex shrink-0 items-center justify-center text-neutral-400 " +
                      (diagram.direction === "HORIZONTAL"
                        ? "py-1 sm:px-1 sm:py-0"
                        : "py-1")
                    }
                    aria-hidden="true"
                  >
                    <span className="text-lg">
                      {diagram.direction === "HORIZONTAL" ? "→" : "↓"}
                    </span>
                    {edge?.label && (
                      <span className="ml-2 text-xs">
                        {edge.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : diagram.diagramType === "COMPARISON" ? (
        <ComparisonDiagram diagram={diagram} />
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {diagram.nodes.map((node) => (
              <DiagramNode
                key={node.id}
                label={node.label}
                detail={node.detail}
                group={node.group}
              />
            ))}
          </div>

          {edges.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              {edges.map((edge, index) => {
                const from = diagram.nodes.find(
                  (node) => node.id === edge.from,
                );
                const to = diagram.nodes.find(
                  (node) => node.id === edge.to,
                );

                return (
                  <div
                    key={edge.from + edge.to + index}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="font-medium">{from?.label}</span>
                    <span aria-hidden="true" className="text-neutral-400">
                      →
                    </span>
                    <span className="font-medium">{to?.label}</span>
                    {edge.label && (
                      <span className="text-neutral-500">
                        · {edge.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {diagram.caption && (
        <figcaption className="mt-5 text-sm leading-6 text-neutral-500">
          {diagram.caption}
        </figcaption>
      )}
    </figure>
  );
}

function DiagramNode({
  label,
  detail,
  group,
}: {
  label: string;
  detail: string | null;
  group: string | null;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950">
      {group && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {group}
        </p>
      )}
      <p className="font-semibold">{label}</p>
      {detail && (
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          {detail}
        </p>
      )}
    </div>
  );
}

function ComparisonDiagram({
  diagram,
}: {
  diagram: LessonDiagram;
}) {
  const groups = new Map<string, LessonDiagram["nodes"]>();

  for (const node of diagram.nodes) {
    const key = node.group || "Comparison";
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {[...groups.entries()].map(([group, nodes]) => (
        <section
          key={group}
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950"
        >
          <h4 className="font-semibold">{group}</h4>
          <div className="mt-3 space-y-3">
            {nodes.map((node) => (
              <div key={node.id}>
                <p className="text-sm font-medium">{node.label}</p>
                {node.detail && (
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    {node.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
