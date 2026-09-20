export function nextVersionNumber(latestVersion: number | null | undefined) {
  return Math.max(0, latestVersion ?? 0) + 1;
}

export type RevisionOperation =
  | { kind: "update"; proposedIndex: number; existingIndex: number }
  | { kind: "create"; proposedIndex: number };

export function planSafeAdditiveRevision(
  existingCount: number,
  proposedCount: number,
): RevisionOperation[] {
  const operations: RevisionOperation[] = [];

  for (let index = 0; index < proposedCount; index += 1) {
    operations.push(
      index < existingCount
        ? { kind: "update", proposedIndex: index, existingIndex: index }
        : { kind: "create", proposedIndex: index },
    );
  }

  return operations;
}
