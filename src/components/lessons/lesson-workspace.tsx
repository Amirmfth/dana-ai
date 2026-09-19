"use client";

import { useState, type ReactNode } from "react";

import { motion } from "framer-motion";

import { LessonMobileControlsContext } from "@/components/lessons/lesson-mobile-controls";
import { tutorPanelTransition } from "@/components/lessons/tutor-panel-motion";
import { LessonTutor } from "@/components/tutor/lesson-tutor";

type LessonWorkspaceProps = {
  children: ReactNode;
  lessonId: string;
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
}: LessonWorkspaceProps) {
  const [isTutorOpen, setTutorOpenState] = useState(false);
  const [isTutorMounted, setTutorMounted] = useState(false);

  function setTutorOpen(isOpen: boolean) {
    if (isOpen) {
      setTutorMounted(true);
    }

    setTutorOpenState(isOpen);
  }

  return (
    <LessonMobileControlsContext.Provider
      value={{
        isTutorOpen,
        setTutorOpen,
      }}
    >
      <motion.div
        animate={{
          gridTemplateColumns: isTutorOpen ? "50% 50%" : "100% 0%",
        }}
        transition={tutorPanelTransition}
        className="relative min-h-dvh lg:grid lg:items-start"
      >
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

        {!isTutorMounted && (
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
