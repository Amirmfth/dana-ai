import { after, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { askCourseTutor } from "@/lib/ai/course-tutor";
import { prisma } from "@/lib/db/prisma";
import { saveCourseExchangeMemories } from "@/lib/memory/save-course-exchange-memories";

type CourseTutorRequest = {
  courseId: string;
  conversationId?: string;
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as CourseTutorRequest;
    const courseId = body.courseId;
    const message = body.message?.trim();

    if (!courseId || !message) {
      return Response.json(
        { error: "Course ID and message are required." },
        { status: 400 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, ownerId: user.id },
      select: { id: true },
    });

    if (!course) {
      return Response.json({ error: "Course not found." }, { status: 404 });
    }

    let conversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: body.conversationId,
            courseId,
            scope: "COURSE",
            lessonId: null,
            course: { ownerId: user.id },
          },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          courseId,
          lessonId: null,
          scope: "COURSE",
        },
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
      take: 10,
    });

    const history = storedMessages.reverse().map((item) => ({
      role:
        item.role === "USER"
          ? ("user" as const)
          : ("assistant" as const),
      content: item.content,
    }));

    const tracked = await askCourseTutor({
      userId: user.id,
      courseId,
      conversationId,
      messages: history,
    });

    const encoder = new TextEncoder();

    let finishMemoryTask!: (
      exchange:
        | {
            userId: string;
            courseId: string;
            userMessage: string;
            assistantMessage: string;
          }
        | null,
    ) => void;

    const memoryTask = new Promise<
      | {
          userId: string;
          courseId: string;
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
        await saveCourseExchangeMemories(exchange);
      } catch (error) {
        console.error("Course tutor memory enrichment failed:", error);
      }
    });

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let answer = "";

        try {
          for await (const event of tracked.stream) {
            if (event.type === "response.output_text.delta") {
              answer += event.delta;
              controller.enqueue(encoder.encode(event.delta));
            }

            if (event.type === "response.completed") {
              await tracked.complete(event.response);
            }

            if (event.type === "error") {
              throw new Error(event.message || "OpenAI streaming error");
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
              userId: user.id,
              courseId,
              userMessage: message,
              assistantMessage: answer,
            });
          } else {
            finishMemoryTask(null);
          }

          controller.close();
        } catch (error) {
          finishMemoryTask(null);
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
    console.error("Course tutor request failed:", error);

    const message = error instanceof Error ? error.message : "";
    const status =
      message.includes("RATE_LIMIT") || message.includes("BUDGET")
        ? 429
        : 500;

    return Response.json(
      {
        error:
          status === 429
            ? "AI usage limit reached."
            : "Failed to get a response from the course tutor.",
      },
      { status },
    );
  }
}
