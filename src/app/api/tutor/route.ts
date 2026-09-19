import { NextRequest } from "next/server";

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
    const body = (await request.json()) as TutorRequest;

    const lessonId = body.lessonId;
    const message = body.message?.trim();

    if (!lessonId || !message) {
      return Response.json(
        {
          error: "Lesson ID and message are required.",
        },
        {
          status: 400,
        },
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId,
      },
    });

    if (!lesson) {
      return Response.json(
        {
          error: "Lesson not found.",
        },
        {
          status: 404,
        },
      );
    }

    let conversation;

    if (body.conversationId) {
      conversation =
        await prisma.conversation.findFirst({
          where: {
            id: body.conversationId,
            lessonId,
          },
        });
    }

    if (!conversation) {
      conversation =
        await prisma.conversation.create({
          data: {
            lessonId,
          },
        });
    }

    const conversationId = conversation.id;

    /*
     * Save the user's message first.
     */
    await prisma.message.create({
      data: {
        conversationId,
        role: "USER",
        content: message,
      },
    });

    /*
     * Retrieve recent conversation history.
     */
    const storedMessages =
      await prisma.message.findMany({
        where: {
          conversationId,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 8,
      });

    const history = storedMessages
      .reverse()
      .map((item) => ({
        role:
          item.role === "USER"
            ? ("user" as const)
            : ("assistant" as const),

        content: item.content,
      }));

    /*
     * Start the OpenAI stream.
     */
    const tracked = await askTutor({
      lessonId,
      conversationId,
      messages: history,
    });

    const encoder = new TextEncoder();

    const responseStream =
      new ReadableStream<Uint8Array>({
        async start(controller) {
          let answer = "";

          try {
            for await (const event of tracked.stream) {
              /*
               * Forward text chunks immediately
               * to the browser.
               */
              if (
                event.type ===
                "response.output_text.delta"
              ) {
                answer += event.delta;

                controller.enqueue(
                  encoder.encode(event.delta),
                );
              }

              /*
               * Final OpenAI response.
               *
               * This contains the final usage
               * information for tracking.
               */
              if (
                event.type ===
                "response.completed"
              ) {
                await tracked.complete(
                  event.response,
                );
              }

              if (event.type === "error") {
                throw new Error(
                  event.message ||
                    "OpenAI streaming error",
                );
              }
            }

            /*
             * Save the complete assistant message
             * after generation finishes.
             */
            if (answer) {
              await prisma.message.create({
                data: {
                  conversationId,
                  role: "ASSISTANT",
                  content: answer,
                },
              });

              await saveExchangeMemories({
                lessonId,
                userMessage: message,
                assistantMessage: answer,
              });
            }

            controller.close();
          } catch (error) {
            console.error(
              "Tutor stream failed:",
              error,
            );

            await tracked.fail(error);

            controller.error(error);
          }
        },
      });

    return new Response(responseStream, {
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",

        "Cache-Control": "no-cache",

        "X-Conversation-Id":
          conversationId,
      },
    });
  } catch (error) {
    console.error(
      "Tutor request failed:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to get a response from the tutor.",
      },
      {
        status: 500,
      },
    );
  }
}