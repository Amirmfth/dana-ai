"use client";

import { FormEvent, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function CourseTutor({
  courseId,
  initialConversationId,
  initialMessages = [],
}: {
  courseId: string;
  initialConversationId?: string;
  initialMessages?: Message[];
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const failed = useRef("");

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || loading) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setInput("");
    setError(undefined);
    setLoading(true);
    failed.current = message;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: message },
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/course-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, conversationId, message }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Tutor request failed.");
      }

      const nextId = response.headers.get("X-Conversation-Id");
      if (nextId) setConversationId(nextId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const snapshot = answer;
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId ? { ...item, content: snapshot } : item,
          ),
        );
      }

      answer += decoder.decode();
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, content: answer } : item,
        ),
      );
      failed.current = "";
    } catch {
      setMessages((current) =>
        current.filter((item) => item.id !== assistantId),
      );
      setError("Dana could not respond. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  const suggestions = [
    "What should I review next?",
    "What are my weakest areas?",
    "Connect the main ideas across this course",
    "Help me prepare for the final assessment",
  ];

  return (
    <section className="flex min-h-[70vh] flex-col rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-10 text-center">
            <h2 className="text-xl font-semibold">Ask Dana about the whole course</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Dana can use your curriculum, progress, assessment history,
              active learner memories, and attached course sources.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className="rounded-full border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={
                "max-w-3xl rounded-2xl px-4 py-3 " +
                (message.role === "user"
                  ? "ml-auto bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                  : "mr-auto bg-neutral-100 dark:bg-neutral-800")
              }
            >
              {message.role === "assistant" ? (
                <div className="prose prose-neutral max-w-none text-sm dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content || "…"}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.content}
                </p>
              )}
            </article>
          ))
        )}
      </div>

      <form onSubmit={submit} className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        {error && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
            <span>{error}</span>
            {failed.current && (
              <button type="button" onClick={() => void send(failed.current)} className="font-semibold underline">
                Retry
              </button>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Ask about concepts, progress, weak areas, sources, or what to study next…"
            className="min-h-12 flex-1 resize-none rounded-xl border border-neutral-300 bg-transparent p-3 text-sm outline-none dark:border-neutral-700"
          />
          <button
            disabled={loading || !input.trim()}
            className="self-end rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-950"
          >
            {loading ? "Thinking…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
