import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
      },
      {
        status: 500,
      },
    );
  }
}