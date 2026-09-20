export const SOURCE_MAX_TEXT_CHARS = 240_000;
export const SOURCE_MAX_CHUNKS = 80;
const DEFAULT_CHUNK_CHARS = 3_200;
const DEFAULT_OVERLAP_CHARS = 300;

export type TextChunk = {
  content: string;
  heading?: string;
  pageStart?: number;
  pageEnd?: number;
};

export function normalizeSourceText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, SOURCE_MAX_TEXT_CHARS);
}

export function chunkSourceText(
  raw: string,
  chunkChars = DEFAULT_CHUNK_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS,
): TextChunk[] {
  const text = normalizeSourceText(raw);
  if (!text) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length && chunks.length < SOURCE_MAX_CHUNKS) {
    let end = Math.min(text.length, start + chunkChars);

    if (end < text.length) {
      const paragraph = text.lastIndexOf("\n\n", end);
      const sentence = text.lastIndexOf(". ", end);
      const split = Math.max(paragraph, sentence);

      if (split > start + Math.floor(chunkChars * 0.55)) {
        end = split + (split === paragraph ? 2 : 2);
      }
    }

    const content = text.slice(start, end).trim();
    if (content) chunks.push({ content });

    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlapChars);
  }

  return chunks;
}
