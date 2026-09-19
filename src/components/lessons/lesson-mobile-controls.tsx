"use client";

import { createContext, useContext } from "react";

type LessonMobileControls = {
  isTutorOpen: boolean;
  setTutorOpen: (isOpen: boolean) => void;
};

export const LessonMobileControlsContext = createContext<LessonMobileControls | null>(null);

export function useLessonMobileControls() {
  const controls = useContext(LessonMobileControlsContext);
  if (!controls) {
    throw new Error("Lesson mobile controls must be used inside LessonWorkspace.");
  }
  return controls;
}
