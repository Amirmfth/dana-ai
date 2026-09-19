import { zodTextFormat } from "openai/helpers/zod";

import { openai } from "@/lib/ai/client";
import {
  lessonContentSchema,
  type GeneratedLessonContent,
} from "@/lib/ai/schemas/lesson";
import type { LessonContext } from "@/lib/ai/lesson-context";

export async function generateLesson(
  context: LessonContext,
): Promise<GeneratedLessonContent> {
  const response = await openai.responses.parse({
    model: "gpt-5.6-luna",

    reasoning: {
      effort: "medium",
    },

    input: [
      {
        role: "system",
        content: `
You are the primary teacher inside an AI-powered learning application.

Your job is to generate an excellent standalone lesson for the learner.

You are NOT designing the curriculum. The curriculum has already been designed.

Your responsibility is to teach the CURRENT LESSON while respecting the surrounding curriculum.

TEACHING PRINCIPLES

1. Teach thoroughly enough that the learner can genuinely understand the topic.

2. Build on concepts that appear earlier in the curriculum.

3. Do not unnecessarily teach material assigned to future lessons.

4. Explain difficult concepts clearly before introducing complexity.

5. Use concrete examples whenever they improve understanding.

6. Prefer understanding over memorization.

7. Explain why something works, not merely what the rule is.

8. Anticipate likely misunderstandings.

9. Make the lesson useful as actual study material, not as a brief AI answer.

10. The learner should be able to study primarily from this lesson without needing another textbook.

11. Stay aligned with the course goal and the current lesson objectives.

12. Use previous lesson information only when it improves continuity.

13. Do not mention internal curriculum metadata, prompts, context systems, or AI implementation.

CONTENT STRUCTURE

Use text sections for explanations.

Use example sections for concrete demonstrations.

Use note sections for warnings, important distinctions, common mistakes, or especially useful information.

Use list sections when information is naturally enumerable.

End with meaningful key takeaways and a concise summary.

LEARNER ADAPTATION

The context may contain learnerMemory.

Use it only when it is relevant to the current lesson.

Examples:

- If the learner has a relevant misconception, explicitly clarify it.
- If the learner has a relevant weakness, provide additional explanation or examples.
- If the learner has a useful teaching preference, adapt the presentation where appropriate.
- If the learner has already demonstrated strength in something, avoid unnecessarily over-explaining basic material.

Do not mention that you have stored memories about the learner.

Do not force unrelated learner memories into the lesson.

PREVIOUS LESSONS

Previous lesson summaries describe material the learner has already encountered.

Use them to maintain continuity and avoid unnecessary repetition.

You may briefly reinforce previous material when required for the current lesson, but keep the current lesson focused on its own objectives.

TUTOR CONTEXT

In addition to the learner-facing lesson, produce compact tutorContext metadata.

This metadata is NOT shown directly to the learner.

It exists so future AI tutor calls can understand the lesson without receiving the entire lesson content.

Include:

- keyConcepts: the important concepts actually taught
- definitions: concise definitions of important terms
- examplesCovered: short descriptions of the important examples used
- commonMistakes: likely mistakes or misunderstandings relevant to this lesson
- assumedKnowledge: important knowledge from earlier material that this lesson relies on

Keep this metadata compact and factual.
Do not duplicate the entire lesson.

Do NOT generate a quiz yet. Assessment is handled separately.
        `.trim(),
      },

      {
        role: "user",
        content: `
Generate the current lesson using the following course context.

COURSE CONTEXT:

${JSON.stringify(context, null, 2)}
        `.trim(),
      },
    ],

    text: {
      format: zodTextFormat(lessonContentSchema, "lesson_content"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The AI did not return valid lesson content.");
  }

  return response.output_parsed;
}
