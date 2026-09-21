import { zodTextFormat } from "openai/helpers/zod";

import { createTrackedResponse } from "@/lib/ai/tracked-response";
import { buildTutorContext } from "@/lib/ai/tutor-context";
import { memoryExtractionSchema } from "@/lib/ai/schemas/memory";

type Exchange = {
  user: string;
  assistant: string;
};

export async function extractMemories({
  lessonId,
  courseId,
  exchange,
}: {
  lessonId: string;
  courseId: string;
  exchange: Exchange;
}) {
  const lessonContext = await buildTutorContext(lessonId);

  const response = await createTrackedResponse({
    operation: "MEMORY_EXTRACTION",
    model: "gpt-5.6-luna",

    reasoning: {
      effort: "low",
    },

    input: [
      {
        role: "system",
        content: `
You extract useful long-term learner memory for an educational application.

Your job is NOT to summarize every conversation.

Only create a memory when the exchange reveals something that could materially improve future teaching.

Useful memories include:

MISCONCEPTION
The learner demonstrates a specific incorrect understanding.

WEAKNESS
The learner appears to struggle with a concept or skill.

STRENGTH
The learner clearly demonstrates meaningful mastery that could affect future teaching.

PREFERENCE
The learner reveals a useful teaching preference, such as preferring examples before abstract explanations.

LEARNING_NOTE
Another durable observation that would genuinely help future lessons or tutoring.

RULES

- Ordinary factual questions should produce zero memories.
- Always capture an explicit durable learner statement about a learning preference, persistent difficulty, misconception, or demonstrated strength when it would improve future teaching.
- Do not store the learner's question just because they asked it.
- Do not store temporary conversational details.
- Do not store information already obvious from the curriculum.
- Memories must be concise and independently understandable.
- Describe the learner, not the conversation.
- Do not invent conclusions unsupported by the exchange.
- Importance ranges from 1 to 5.
- Use importance 4 or 5 only for information likely to substantially affect future teaching.
        `.trim(),
      },

      {
        role: "user",
        content: `
LESSON CONTEXT

${JSON.stringify(lessonContext)}

EXCHANGE

Learner:
${exchange.user}

Tutor:
${exchange.assistant}
        `.trim(),
      },
    ],

    text: {
      format: zodTextFormat(memoryExtractionSchema, "memory_extraction"),
    },

    courseId,
    lessonId,
  });

  return memoryExtractionSchema.parse(JSON.parse(response.output_text)).memories;
}
