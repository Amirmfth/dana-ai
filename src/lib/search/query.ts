export function normalizeWorkspaceSearchQuery(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function hasSearchableWorkspaceQuery(raw: string) {
  return normalizeWorkspaceSearchQuery(raw).length >= 2;
}
