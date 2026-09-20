import { after, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { askTutor } from "@/lib/ai/tutor";
import { prisma } from "@/lib/db/prisma";
import { saveExchangeMemories } from "@/lib/memory/save-exchange-memories";

type TutorRequest = {
  lessonId: string;
  conversationId?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as TutorRequest;
    const lessonId = body.lessonId;
    const message = body.message?.trim();

    if (!lessonId || !message) {
      return Response.json(
        { error: "Lesson ID and message are required." },
        { status: 400 },
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        status: { not: "LOCKED" },
        module: { course: { ownerId: user.id } },
      },
      select: { id: true },
    });

    if (!lesson) {
      return Response.json(
        { error: "Lesson not found." },
        { status: 404 },
      );
    }

    let conversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: body.conversationId,
            lessonId,
          },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { lessonId },
      });
    }

    const conversationId = conversation.id;

    await prisma.message.create({
      data: {
        conversationId,
        role: "USER",
        content: message,
      },
    });

    const storedMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const history = storedMessages.reverse().map((item) => ({
      role:
        item.role === "USER"
          ? ("user" as const)
          : ("assistant" as const),
      content: item.content,
    }));

    const tracked = await askTutor({
      lessonId,
      conversationId,
      messages: history,
    });

    const encoder = new TextEncoder();

    let finishMemoryTask!: (
      exchange:
        | {
            lessonId: string;
            userMessage: string;
            assistantMessage: string;
          }
        | null,
    ) => void;

    const memoryTask = new Promise<
      | {
          lessonId: string;
          userMessage: string;
          assistantMessage: string;
        }
      | null
    >((resolve) => {
      finishMemoryTask = resolve;
    });

    after(async () => {
      const exchange = await memoryTask;

      if (!exchange) return;

      try {
        await saveExchangeMemories(exchange);
      } catch (error) {
        console.error(
          "Tutor memory enrichment failed:",
          error,
        );
      }
    });

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let answer = "";

        try {
          for await (const event of tracked.stream) {
            if (event.type === "response.output_text.delta") {
              answer += event.delta;
              controller.enqueue(
                encoder.encode(event.delta),
              );
            }

            if (event.type === "response.completed") {
              await tracked.complete(event.response);
            }

            if (event.type === "error") {
              throw new Error(
                event.message || "OpenAI streaming error",
              );
            }
          }

          if (answer) {
            await prisma.message.create({
              data: {
                conversationId,
                role: "ASSISTANT",
                content: answer,
              },
            });

            finishMemoryTask({
              lessonId,
              userMessage: message,
              assistantMessage: answer,
            });
          }

          controller.close();
        } catch (error) {
          finishMemoryTask(null);
          console.error("Tutor stream failed:", error);
          await tracked.fail(error);
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Conversation-Id": conversationId,
      },
    });
  } catch (error) {
    console.error("Tutor request failed:", error);

    const message =
      error instanceof Error ? error.message : "";
    const status =
      message.includes("RATE_LIMIT") ||
      message.includes("BUDGET")
        ? 429
        : 500;

    return Response.json(
      {
        error:
          status === 429
            ? "AI usage limit reached."
            : "Failed to get a response from the tutor.",
      },
      { status },
    );
  }
}
