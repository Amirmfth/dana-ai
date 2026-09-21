import type { MemoryType } from "@/generated/prisma/client";

export type ExplicitLearnerMemory = {
  type: MemoryType;
  content: string;
  importance: number;
};

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 700);
}

export function inferExplicitLearnerMemories(
  userMessage: string,
): ExplicitLearnerMemory[] {
  const message = compact(userMessage);
  if (!message) return [];

  const lower = message.toLowerCase();

  const preferencePatterns = [
    /\bi (?:really )?prefer\b/,
    /\bi learn better\b/,
    /\bit helps me (?:when|if)\b/,
    /\bexamples help me\b/,
    /\bplease explain .* (?:with|using) examples\b/,
  ];

  if (preferencePatterns.some((pattern) => pattern.test(lower))) {
    return [{
      type: "PREFERENCE",
      content: "Learner teaching preference: " + message,
      importance: 3,
    }];
  }

  const weaknessPatterns = [
    /\bi (?:still )?(?:do not|don't) understand\b/,
    /\bi (?:really )?struggle with\b/,
    /\bi(?:'m| am) confused (?:about|by|with)\b/,
    /\bi find .* (?:hard|difficult|confusing)\b/,
    /\bi(?:'m| am) (?:bad|weak) at\b/,
  ];

  if (weaknessPatterns.some((pattern) => pattern.test(lower))) {
    return [{
      type: "WEAKNESS",
      content: "Learner reports difficulty: " + message,
      importance: 4,
    }];
  }

  const strengthPatterns = [
    /\bi already (?:know|understand)\b/,
    /\bi(?:'m| am) comfortable with\b/,
    /\bi(?:'m| am) (?:good|strong) at\b/,
  ];

  if (strengthPatterns.some((pattern) => pattern.test(lower))) {
    return [{
      type: "STRENGTH",
      content: "Learner reports prior strength: " + message,
      importance: 3,
    }];
  }

  return [];
}
