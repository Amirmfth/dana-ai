"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

const FONT_SIZES = ["SMALL", "DEFAULT", "LARGE", "EXTRA_LARGE"] as const;
const LINE_HEIGHTS = ["TIGHT", "NORMAL", "RELAXED"] as const;
const READING_WIDTHS = ["NARROW", "STANDARD", "WIDE"] as const;
const DENSITIES = ["COMPACT", "COMFORTABLE", "SPACIOUS"] as const;
const MOTION = ["SYSTEM", "REDUCED", "FULL"] as const;
const READING_THEMES = ["DEFAULT", "PAPER", "SEPIA", "DARK", "HIGH_CONTRAST"] as const;

function enumValue<T extends readonly string[]>(
  value: FormDataEntryValue | null,
  allowed: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && allowed.includes(value as T[number])
    ? (value as T[number])
    : fallback;
}

function language(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().slice(0, 80);
  return normalized.length >= 2 ? normalized : fallback;
}

export async function updateExperienceSettingsAction(formData: FormData) {
  const user = await requireUser();

  const data = {
    uiLanguage: language(formData.get("uiLanguage"), "English"),
    defaultContentLanguage: language(formData.get("defaultContentLanguage"), "English"),
    tutorLanguage: language(formData.get("tutorLanguage"), "English"),
    fontSize: enumValue(formData.get("fontSize"), FONT_SIZES, "DEFAULT"),
    lineHeight: enumValue(formData.get("lineHeight"), LINE_HEIGHTS, "NORMAL"),
    readingWidth: enumValue(formData.get("readingWidth"), READING_WIDTHS, "STANDARD"),
    readingDensity: enumValue(formData.get("readingDensity"), DENSITIES, "COMFORTABLE"),
    motionPreference: enumValue(formData.get("motionPreference"), MOTION, "SYSTEM"),
    highContrast: formData.get("highContrast") === "on",
    dyslexiaFriendly: formData.get("dyslexiaFriendly") === "on",
    readingTheme: enumValue(formData.get("readingTheme"), READING_THEMES, "DEFAULT"),
  };

  await prisma.userExperienceSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/settings/experience");
}


export async function updateLessonReadingPreferencesAction(input: {
  fontSize: (typeof FONT_SIZES)[number];
  readingTheme: (typeof READING_THEMES)[number];
}) {
  const user = await requireUser();

  const fontSize = FONT_SIZES.includes(input.fontSize) ? input.fontSize : "DEFAULT";
  const readingTheme = READING_THEMES.includes(input.readingTheme)
    ? input.readingTheme
    : "DEFAULT";

  await prisma.userExperienceSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fontSize,
      readingTheme,
    },
    update: {
      fontSize,
      readingTheme,
    },
  });

  revalidatePath("/settings/experience");
}
