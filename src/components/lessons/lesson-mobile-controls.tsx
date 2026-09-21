"use client";

import { createContext, useContext } from "react";

export type LessonFontSize = "SMALL" | "DEFAULT" | "LARGE" | "EXTRA_LARGE";
export type LessonReadingTheme =
  | "DEFAULT"
  | "PAPER"
  | "SEPIA"
  | "DARK"
  | "HIGH_CONTRAST";

type LessonMobileControls = {
  isTutorOpen: boolean;
  setTutorOpen: (isOpen: boolean) => void;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  fontSize: LessonFontSize;
  setFontSize: (fontSize: LessonFontSize) => void;
  readingTheme: LessonReadingTheme;
  setReadingTheme: (theme: LessonReadingTheme) => void;
  dyslexiaFriendly: boolean;
  setDyslexiaFriendly: (enabled: boolean) => void;
  isSavingReadingPreferences: boolean;
};

export const LessonMobileControlsContext =
  createContext<LessonMobileControls | null>(null);

export function useLessonMobileControls() {
  const controls = useContext(LessonMobileControlsContext);
  if (!controls) {
    throw new Error("Lesson mobile controls must be used inside LessonWorkspace.");
  }
  return controls;
}
