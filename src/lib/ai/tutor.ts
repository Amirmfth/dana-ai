import { createTrackedResponseStream } from "@/lib/ai/tracked-response";
import { buildTutorContext } from "@/lib/ai/tutor-context";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askTutor({
  lessonId,
  conversationId,
  messages,
}: {
  lessonId: string;
  conversationId: string;
  messages: TutorMessage[];
}) {
  const recentMessages = messages.slice(-8);
  const latestUserMessage =
    [...recentMessages].reverse().find((message) => message.role === "user")
      ?.content ?? "";

  const context = await buildTutorContext(
    lessonId,
    latestUserMessage,
  );

  const input = [
    {
      role: "system" as const,
      content: `
You are Dana, an interactive tutor helping a learner with the current lesson.

Answer the learner's question directly and concisely.

Use the supplied lesson context as your source of truth.

Teaching rules:
- Focus on the current lesson.
- Explain differently when the learner is confused.
- Use short examples when helpful.
- Connect to prior knowledge when useful.
- Avoid future or advanced material unless necessary to answer the question.
- Do not repeat large parts of the lesson.
- Prefer concise conversational answers.
- Ask a short follow-up question only when it meaningfully helps learning.
- If sourceContext is present, use it as primary evidence for source-specific factual claims.
- Cite source-backed claims with the supplied markers such as [S1].
- Never invent a citation marker that is not present in sourceContext.
      `.trim(),
    },

    {
      role: "system" as const,
      content: JSON.stringify(context),
    },

    ...recentMessages,
  ];

  return createTrackedResponseStream({
    operation: "TUTOR",

    model: "gpt-5.6-luna",

    reasoning: {
      effort: "low",
    },

    input,

    lessonId,
    conversationId,
  });
}