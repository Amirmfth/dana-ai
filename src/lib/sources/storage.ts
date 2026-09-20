import { getSupabaseAuthConfig } from "@/lib/auth/config";
import { getCurrentAccessToken } from "@/lib/auth/server";

const BUCKET = "course-sources";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeName(name: string) {
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "source";
}

async function storageRequest(path: string, init: RequestInit) {
  const token = await getCurrentAccessToken();
  if (!token) throw new Error("Authentication is required.");

  const { url, publishableKey } = getSupabaseAuthConfig();
  return fetch(url + "/storage/v1" + path, {
    ...init,
    headers: {
      apikey: publishableKey,
      Authorization: "Bearer " + token,
      ...init.headers,
    },
    cache: "no-store",
  });
}

export async function uploadSourceFile(
  userId: string,
  sourceId: string,
  file: File,
) {
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("Source files must be between 1 byte and 8 MB.");
  }

  const lowerName = file.name.toLowerCase();
  const mimeType =
    file.type ||
    (lowerName.endsWith(".pdf")
      ? "application/pdf"
      : lowerName.endsWith(".md")
        ? "text/markdown"
        : lowerName.endsWith(".txt")
          ? "text/plain"
          : "");

  const allowed = new Set([
    "application/pdf",
    "text/plain",
    "text/markdown",
  ]);
  if (!allowed.has(mimeType)) {
    throw new Error("Only PDF, plain text, and Markdown files are supported.");
  }

  const path =
    userId + "/" + sourceId + "/" + Date.now() + "-" + safeName(file.name);

  const response = await storageRequest(
    "/object/" + BUCKET + "/" + encodeStoragePath(path),
    {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: file,
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      "Failed to upload source file." + (message ? " " + message : ""),
    );
  }

  return path;
}

export async function deleteSourceFile(path: string) {
  const response = await storageRequest(
    "/object/" + BUCKET + "/" + encodeStoragePath(path),
    { method: "DELETE" },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete source file.");
  }
}
