import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import { sourceExtractionSchema, type SourceExtraction } from "@/lib/ai/schemas/source";

async function uploadOpenAiFile(file: File) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const body = new FormData();
  body.set("purpose", "user_data");
  body.set("file", file);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body,
  });

  if (!response.ok) throw new Error("Failed to prepare PDF for extraction.");

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) throw new Error("PDF upload did not return a file ID.");
  return payload.id;
}

async function deleteOpenAiFile(fileId: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;

  await fetch("https://api.openai.com/v1/files/" + encodeURIComponent(fileId), {
    method: "DELETE",
    headers: { Authorization: "Bearer " + apiKey },
  }).catch(() => null);
}

export async function extractPdfSource(
  userId: string,
  file: File,
  courseId?: string,
): Promise<SourceExtraction> {
  const fileId = await uploadOpenAiFile(file);

  try {
    const response = await createTrackedResponse({
      userId,
      courseId,
      operation: "SOURCE_INGESTION",
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_file", file_id: fileId },
            {
              type: "input_text",
              text: [
                "Extract this PDF into factual study chunks.",
                "Preserve page numbers when identifiable.",
                "Do not summarize away important definitions, procedures, examples, or constraints.",
                "Return at most 80 chunks, each no more than about 3500 characters.",
                "Use heading when a section heading is clear.",
              ].join("\n"),
            },
          ],
        },
      ],
      text: { format: zodTextFormat(sourceExtractionSchema, "source_extraction") },
    });

    return sourceExtractionSchema.parse(JSON.parse(response.output_text));
  } finally {
    await deleteOpenAiFile(fileId);
  }
}
