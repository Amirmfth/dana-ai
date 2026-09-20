"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLessonMobileControls } from "@/components/lessons/lesson-mobile-controls";
import { tutorPanelTransition } from "@/components/lessons/tutor-panel-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type InitialMessage = Message & {
  createdAt: string;
};

type LessonTutorProps = {
  isOpen: boolean;
  onExitComplete: () => void;
  lessonId: string;
  initialConversationId?: string;
  initialMessages?: InitialMessage[];
};

const suggestedPrompts = [
  "Explain this more simply",
  "Give me an example",
  "What should I remember?",
];

export function LessonTutor({
  isOpen,
  onExitComplete,
  lessonId,
  initialConversationId,
  initialMessages = [],
}: LessonTutorProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
  const failedMessage = useRef<string | undefined>(undefined);
  const { isTutorOpen, setTutorOpen } = useLessonMobileControls();

  useEffect(() => {
    const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;

    if (!isTutorOpen || !isMobileViewport) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = document.getElementById(
      "ask-dana-trigger-mobile",
    ) as HTMLButtonElement | null;
    document.body.style.overflow = "hidden";
    document.getElementById("lesson-tutor-input-mobile")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setTutorOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isTutorOpen, setTutorOpen]);

  async function sendMessage(rawMessage: string, addMessage = true) {
    const message = rawMessage.trim();

    if (!message || isLoading) return;

    const userMessageId = createMessageId();
    const assistantMessageId = createMessageId();

    setInput("");
    setError(undefined);
    setIsLoading(true);
    setHasStartedStreaming(false);

    if (addMessage) {
      setMessages((current) => [
        ...current,
        {
          id: userMessageId,
          role: "user",
          content: message,
        },
      ]);
    }

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          conversationId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Tutor request failed.");
      }

      /*
       * The route now sends the conversation ID
       * through a response header.
       */
      const newConversationId = response.headers.get("X-Conversation-Id");

      if (newConversationId) {
        setConversationId(newConversationId);
      }

      if (!response.body) {
        throw new Error("Streaming response unavailable.");
      }

      /*
       * Create the assistant bubble before any
       * text has arrived.
       */
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let receivedAnswer = "";
      let displayedAnswer = "";

      let buffer = "";
      let streamFinished = false;
      let receivedFirstChunk = false;

      async function revealBuffer() {
        while (!streamFinished || buffer.length > 0) {
          if (!buffer.length) {
            await sleep(20);
            continue;
          }

          /*
           * Adaptive reveal speed.
           *
           * If the model is generating faster than we're displaying,
           * reveal more characters at once so we don't fall way behind.
           */
          let characterCount = 1;

          if (buffer.length > 300) {
            characterCount = 12;
          } else if (buffer.length > 150) {
            characterCount = 8;
          } else if (buffer.length > 60) {
            characterCount = 4;
          }

          const next = buffer.slice(0, characterCount);

          buffer = buffer.slice(characterCount);
          displayedAnswer += next;

          const currentAnswer = displayedAnswer;

          setMessages((current) =>
            current.map((item) =>
              item.id === assistantMessageId
                ? {
                    ...item,
                    content: currentAnswer,
                  }
                : item,
            ),
          );

          await sleep(18);
        }
      }

      const revealPromise = revealBuffer();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) continue;

        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          setHasStartedStreaming(true);
        }

        receivedAnswer += chunk;
        buffer += chunk;
      }

      const remaining = decoder.decode();

      if (remaining) {
        receivedAnswer += remaining;
        buffer += remaining;
      }

      streamFinished = true;

      await revealPromise;

      /*
       * Ensure what we displayed exactly matches
       * what was actually received.
       */
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId
            ? {
                ...item,
                content: receivedAnswer,
              }
            : item,
        ),
      );

      failedMessage.current = undefined;
    } catch (requestError) {
      console.error(requestError);

      failedMessage.current = message;

      /*
       * Remove the empty/partial assistant message
       * if streaming failed.
       */
      setMessages((current) =>
        current.filter((item) => item.id !== assistantMessageId),
      );

      setError("Dana could not respond. Check your connection and try again.");
    } finally {
      setIsLoading(false);
      setHasStartedStreaming(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function usePrompt(prompt: string, inputId: string) {
    setInput(prompt);
    requestAnimationFrame(() => document.getElementById(inputId)?.focus());
  }

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && [
        <motion.aside
          key="desktop-tutor"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={tutorPanelTransition}
          className="sticky top-0 hidden h-dvh min-w-0 border-l border-neutral-200 bg-neutral-50/70 lg:flex lg:flex-col dark:border-neutral-800 dark:bg-neutral-900/70"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              AI tutor
            </p>
            <button
              type="button"
              onClick={() => setTutorOpen(false)}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
            >
              Close
            </button>
          </div>

          <TutorSurface
            inputId="lesson-tutor-input-desktop"
            className="min-h-0 flex-1 max-h-none rounded-none border-0 bg-transparent px-4 pt-8 shadow-none xl:px-4 xl:pt-10"
            messages={messages}
            input={input}
            isLoading={isLoading}
            error={error}
            hasStartedStreaming={hasStartedStreaming}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onPrompt={usePrompt}
            onRetry={() =>
              failedMessage.current &&
              void sendMessage(failedMessage.current, false)
            }
          />
        </motion.aside>,

        <motion.div
          key="mobile-tutor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-30 flex items-end bg-black/70 lg:hidden"
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-tutor-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="flex h-[92dvh] min-h-[97dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
              <p
                id="mobile-tutor-title"
                className="text-sm font-semibold text-neutral-500 dark:text-neutral-400"
              >
                AI tutor
              </p>
              <button
                type="button"
                onClick={() => setTutorOpen(false)}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
              >
                Close
              </button>
            </div>
            <TutorSurface
              inputId="lesson-tutor-input-mobile"
              className="h-full max-h-none rounded-none border-0 px-5 shadow-none"
              messages={messages}
              input={input}
              isLoading={isLoading}
              error={error}
              hasStartedStreaming={hasStartedStreaming}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onPrompt={usePrompt}
              onRetry={() =>
                failedMessage.current &&
                void sendMessage(failedMessage.current, false)
              }
            />
          </motion.div>
        </motion.div>,
      ]}
    </AnimatePresence>
  );
}

type TutorSurfaceProps = {
  inputId: string;
  className?: string;
  messages: Message[];
  input: string;
  isLoading: boolean;
  error?: string;
  hasStartedStreaming: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPrompt: (prompt: string, inputId: string) => void;
  onRetry: () => void;
};

function TutorSurface({
  inputId,
  className,
  messages,
  input,
  isLoading,
  error,
  hasStartedStreaming,
  onInputChange,
  onSubmit,
  onPrompt,
  onRetry,
}: TutorSurfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  }, [messages, isLoading, hasStartedStreaming]);

  useLayoutEffect(() => {
    const textarea = composerInputRef.current;
    if (!textarea) return;

    const minHeight = 56;
    const maxHeight = 160;

    // Empty composer always has its minimum height.
    if (input.length === 0) {
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = "hidden";
      return;
    }

    textarea.style.height = `${minHeight}px`;

    const contentHeight = textarea.scrollHeight;

    textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
    textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  return (
    <section
      className={`flex min-h-0 max-h-[calc(100dvh-4rem)] flex-col rounded-2xl border border-neutral-200 bg-white px-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none ${className ?? ""}`}
    >
      {messages.length === 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrompt(prompt, inputId)}
              className="min-h-11 rounded-xl border border-neutral-200 px-3 text-left text-sm text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-thin"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[90%] rounded-2xl bg-neutral-950 px-4 py-3 text-white dark:bg-white dark:text-neutral-950"
                  : "max-w-[95%] rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
              }
            >
              {message.role === "assistant" ? (
                <TutorMarkdown
                  content={message.content}
                  isRtl={isRtlText(message.content)}
                />
              ) : (
                <p dir="auto" className="whitespace-pre-line text-sm leading-6">
                  {message.content}
                </p>
              )}
            </div>
          ))}
          {isLoading && !hasStartedStreaming && (
            <div className="flex items-center gap-1 px-1 py-2">
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-400" />

              <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                Dana is thinking
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
          >
            Try again
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="mt-auto border-t border-neutral-200 py-4 dark:border-neutral-800"
      >
        <label htmlFor={inputId} className="sr-only">
          Ask Dana a question about this lesson
        </label>

        <div className="relative rounded-3xl border border-neutral-300 bg-neutral-50 transition focus-within:border-neutral-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-950/10 dark:border-neutral-700 dark:bg-neutral-950 dark:focus-within:border-neutral-500 dark:focus-within:bg-neutral-900 dark:focus-within:ring-white/15">
          <textarea
            ref={composerInputRef}
            dir="auto"
            id={inputId}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask anything about this lesson"
            rows={1}
            disabled={isLoading}
            className="[min-h-14 max-h-40 w-full resize-none overflow-y-hidden bg-transparent px-4 py-4 pr-16 text-base leading-6 text-neutral-950 outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label={isLoading ? "Dana is responding" : "Send question"}
            className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-neutral-950 text-[0px] text-white transition hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
          >
            {isLoading ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="32"
                  strokeDashoffset="10"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                className="size-5"
              >
                <path
                  d="M12 19V5M6 11l6-6 6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>

        <p className="mt-2 text-center text-xs leading-5 text-neutral-500 dark:text-neutral-400">
          Enter for a new line · Shift + Enter to send
        </p>
      </form>
    </section>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMessageId() {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  if (typeof browserCrypto?.getRandomValues === "function") {
    const bytes = browserCrypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const value = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isRtlText(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function TutorMarkdown({
  content,
  isRtl,
}: {
  content: string;
  isRtl: boolean;
}) {
  return (
    <div
      dir="auto"
      className={
        isRtl
          ? "font-persian text-start text-[15px] leading-8"
          : "text-start text-sm leading-6"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 text-sm leading-6 last:mb-0">{children}</p>
          ),

          h1: ({ children }) => (
            <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">
              {children}
            </h3>
          ),

          h2: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base font-semibold first:mt-0">
              {children}
            </h3>
          ),

          h3: ({ children }) => (
            <h4 className="mb-2 mt-4 text-sm font-semibold first:mt-0">
              {children}
            </h4>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-neutral-950 dark:text-white">
              {children}
            </strong>
          ),

          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 ps-5 text-sm leading-6">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 ps-5 text-sm leading-6">
              {children}
            </ol>
          ),

          li: ({ children }) => <li>{children}</li>,

          blockquote: ({ children }) => (
            <blockquote className="my-3 border-s-2 border-neutral-300 ps-4 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300">
              {children}
            </blockquote>
          ),

          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              {children}
            </a>
          ),

          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-neutral-950 p-4 font-mono text-sm leading-6 text-neutral-100">
              {children}
            </pre>
          ),

          code: ({ children, className, ...props }) => (
            <code
              className={
                className
                  ? className
                  : "rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[0.85em] dark:bg-neutral-700"
              }
              {...props}
            >
              {children}
            </code>
          ),

          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border border-neutral-300 bg-neutral-100 px-3 py-2 font-semibold dark:border-neutral-700 dark:bg-neutral-900">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-neutral-300 px-3 py-2 dark:border-neutral-700">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
