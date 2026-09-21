import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import { buildCourseTutorContext } from "@/lib/ai/course-tutor-context";
import { memoryExtractionSchema } from "@/lib/ai/schemas/memory";

export async function extractCourseMemories({
  userId,
  courseId,
  exchange,
}: {
  userId: string;
  courseId: string;
  exchange: {
    user: string;
    assistant: string;
  };
}) {
  const context = await buildCourseTutorContext(
    userId,
    courseId,
    exchange.user,
  );

  const response = await createTrackedResponse({
    operation: "MEMORY_EXTRACTION",
    model: "gpt-5.6-luna",
    reasoning: { effort: "low" },
    userId,
    courseId,
    input: [
      {
        role: "system",
        content: [
          "Extract only durable learner memories that can materially improve future teaching.",
          "Allowed types: MISCONCEPTION, WEAKNESS, STRENGTH, PREFERENCE, LEARNING_NOTE.",
          "Ordinary factual questions should produce zero memories.",
          "Always capture an explicit durable learner statement about a learning preference, persistent difficulty, misconception, or demonstrated strength when it would improve future teaching.",
          "Do not store temporary conversational details or facts already obvious from the curriculum.",
          "Describe the learner, not the conversation.",
          "Do not invent conclusions.",
          "Importance must be 1 to 5.",
        ].join("\n"),
      },
      {
        role: "user",
        content:
          "COURSE CONTEXT\n\n" +
          JSON.stringify(context) +
          "\n\nEXCHANGE\nLearner:\n" +
          exchange.user +
          "\n\nTutor:\n" +
          exchange.assistant,
      },
    ],
    text: {
      format: zodTextFormat(
        memoryExtractionSchema,
        "memory_extraction",
      ),
    },
  });

  return memoryExtractionSchema.parse(
    JSON.parse(response.output_text),
  ).memories;
}
