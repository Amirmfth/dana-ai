import { createTrackedResponseStream } from "@/lib/ai/tracked-response";
import { buildCourseTutorContext } from "@/lib/ai/course-tutor-context";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askCourseTutor({
  userId,
  courseId,
  conversationId,
  messages,
}: {
  userId: string;
  courseId: string;
  conversationId: string;
  messages: TutorMessage[];
}) {
  const recentMessages = messages.slice(-10);
  const latestUserMessage =
    [...recentMessages].reverse().find((message) => message.role === "user")
      ?.content ?? "";

  const context = await buildCourseTutorContext(
    userId,
    courseId,
    latestUserMessage,
  );

  const input = [
    {
      role: "system" as const,
      content: [
        "You are Dana, a course-wide learning tutor.",
        "Help the learner reason across the whole course rather than only one lesson.",
        "Use the supplied curriculum, learning state, active learner memories, and source context.",
        "",
        "Teaching rules:",
        "- Answer the learner's question directly.",
        "- Connect concepts across lessons and modules when useful.",
        "- Use progress, quiz, and assessment evidence when making study recommendations.",
        "- Distinguish what the learner has completed from what is still ahead.",
        "- Do not claim mastery or weakness without evidence in learningState or learnerMemory.",
        "- Prefer concise, actionable explanations.",
        "- If sourceContext is present, use it as primary evidence for source-specific factual claims.",
        "- Cite source-backed claims only with supplied markers such as [S1].",
        "- Never invent source markers.",
        "- Respond in context.preferences.tutorLanguage, independently of the course content language.",
        "- Only switch response language when the learner explicitly requests it in the current message.",
        "- Do not dump the full curriculum unless the learner asks for it.",
      ].join("\n"),
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
    reasoning: { effort: "low" },
    input,
    userId,
    courseId,
    conversationId,
  });
}
