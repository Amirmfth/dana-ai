"use client";

import { useState, useTransition, type CSSProperties, type ReactNode } from "react";

import { motion, useReducedMotion } from "framer-motion";

import {
  LessonMobileControlsContext,
  type LessonFontSize,
  type LessonReadingTheme,
} from "@/components/lessons/lesson-mobile-controls";
import { updateLessonReadingPreferencesAction } from "@/app/settings/experience/actions";
import { tutorPanelTransition } from "@/components/lessons/tutor-panel-motion";
import { LessonTutor } from "@/components/tutor/lesson-tutor";

type LessonWorkspaceProps = {
  children: ReactNode;
  lessonId: string;
  preferences?: {
    fontSize: "SMALL" | "DEFAULT" | "LARGE" | "EXTRA_LARGE";
    lineHeight: "TIGHT" | "NORMAL" | "RELAXED";
    readingWidth: "NARROW" | "STANDARD" | "WIDE";
    readingDensity: "COMPACT" | "COMFORTABLE" | "SPACIOUS";
    motionPreference: "SYSTEM" | "REDUCED" | "FULL";
    highContrast: boolean;
    dyslexiaFriendly: boolean;
    readingTheme: LessonReadingTheme;
  };
  conversation?: {
    id: string;
    messages: Array<{
      id: string;
      role: "USER" | "ASSISTANT";
      content: string;
      createdAt: string;
    }>;
  };
};

export function LessonWorkspace({
  children,
  lessonId,
  conversation,
  preferences,
}: LessonWorkspaceProps) {
  const systemReducedMotion = useReducedMotion();
  const [isTutorOpen, setTutorOpenState] = useState(false);
  const [isTutorMounted, setTutorMounted] = useState(false);
  const [isFocusMode, setFocusMode] = useState(false);
  const [fontSize, setFontSizeState] = useState<LessonFontSize>(
    preferences?.fontSize ?? "DEFAULT",
  );
  const [readingTheme, setReadingThemeState] = useState<LessonReadingTheme>(
    preferences?.readingTheme ?? "DEFAULT",
  );
  const [dyslexiaFriendly, setDyslexiaFriendlyState] = useState(
    preferences?.dyslexiaFriendly ?? false,
  );
  const [isSavingReadingPreferences, startSavingReadingPreferences] =
    useTransition();

  const reduceMotion =
    preferences?.motionPreference === "REDUCED" ||
    (preferences?.motionPreference !== "FULL" && systemReducedMotion);

  const style = {
    "--dana-reading-font-size": {
      SMALL: "0.9375rem",
      DEFAULT: "1rem",
      LARGE: "1.125rem",
      EXTRA_LARGE: "1.25rem",
    }[fontSize],
    "--dana-reading-line-height": {
      TIGHT: "1.55",
      NORMAL: "1.75",
      RELAXED: "1.95",
    }[preferences?.lineHeight ?? "NORMAL"],
    "--dana-reading-width": {
      NARROW: "36rem",
      STANDARD: "42rem",
      WIDE: "52rem",
    }[preferences?.readingWidth ?? "STANDARD"],
    "--dana-section-gap": {
      COMPACT: "2rem",
      COMFORTABLE: "3rem",
      SPACIOUS: "4rem",
    }[preferences?.readingDensity ?? "COMFORTABLE"],
  } as CSSProperties;

  function setTutorOpen(isOpen: boolean) {
    if (isFocusMode && isOpen) return;
    if (isOpen) {
      setTutorMounted(true);
    }

    setTutorOpenState(isOpen);
  }

  function persistReadingPreferences(
    nextFontSize: LessonFontSize,
    nextTheme: LessonReadingTheme,
    nextDyslexiaFriendly: boolean,
  ) {
    startSavingReadingPreferences(async () => {
      await updateLessonReadingPreferencesAction({
        fontSize: nextFontSize,
        readingTheme: nextTheme,
        dyslexiaFriendly: nextDyslexiaFriendly,
      });
    });
  }

  function setFontSize(nextFontSize: LessonFontSize) {
    setFontSizeState(nextFontSize);
    persistReadingPreferences(nextFontSize, readingTheme, dyslexiaFriendly);
  }

  function setReadingTheme(nextTheme: LessonReadingTheme) {
    setReadingThemeState(nextTheme);
    persistReadingPreferences(fontSize, nextTheme, dyslexiaFriendly);
  }

  function setDyslexiaFriendly(enabled: boolean) {
    setDyslexiaFriendlyState(enabled);
    persistReadingPreferences(fontSize, readingTheme, enabled);
  }

  function toggleFocusMode() {
    setFocusMode((current) => {
      const next = !current;
      if (next) {
        setTutorOpenState(false);
        setTutorMounted(false);
      }
      return next;
    });
  }

  return (
    <LessonMobileControlsContext.Provider
      value={{
        isTutorOpen,
        setTutorOpen,
        isFocusMode,
        toggleFocusMode,
        fontSize,
        setFontSize,
        readingTheme,
        setReadingTheme,
        dyslexiaFriendly,
        setDyslexiaFriendly,
        isSavingReadingPreferences,
      }}
    >
      <motion.div
        style={style}
        data-reduced-motion={reduceMotion ? "true" : "false"}
        animate={{ gridTemplateColumns: isTutorOpen ? "50% 50%" : "100% 0%" }}
        transition={reduceMotion ? { duration: 0 } : tutorPanelTransition}
        className={[
          "lesson-workspace relative min-h-dvh lg:grid lg:items-start",
          isFocusMode ? "focus-mode" : "",
          preferences?.highContrast ? "dana-high-contrast" : "",
          dyslexiaFriendly ? "dana-dyslexia-friendly" : "",
          "dana-reading-theme-" + readingTheme.toLowerCase().replaceAll("_", "-"),
        ].filter(Boolean).join(" ")}
      >
        <button
          type="button"
          onClick={toggleFocusMode}
          className="fixed right-5 top-5 z-40 hidden min-h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold shadow-sm lg:inline-flex lg:items-center dark:border-neutral-700 dark:bg-neutral-900"
          aria-pressed={isFocusMode}
        >
          {isFocusMode ? "Exit focus" : "Focus"}
        </button>
        <div className="min-w-0">{children}</div>

        {isTutorMounted && (
          <LessonTutor
            isOpen={isTutorOpen}
            onExitComplete={() => setTutorMounted(false)}
            lessonId={lessonId}
            initialConversationId={conversation?.id}
            initialMessages={
              conversation?.messages.map((message) => ({
                id: message.id,

                role:
                  message.role === "USER"
                    ? ("user" as const)
                    : ("assistant" as const),

                content: message.content,
                createdAt: message.createdAt,
              })) ?? []
            }
          />
        )}

        {!isTutorMounted && !isFocusMode && (
          <button
            id="ask-dana-trigger-desktop"
            type="button"
            onClick={() => setTutorOpen(true)}
            className="fixed bottom-6 right-6 z-30 hidden min-h-12 items-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white shadow-xl transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 lg:flex dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
            >
              <path
                d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
                strokeLinecap="round"
              />
            </svg>
            Ask Dana
          </button>
        )}
      </motion.div>
    </LessonMobileControlsContext.Provider>
  );
}
