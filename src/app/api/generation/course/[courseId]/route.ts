import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await requireUser();
  const { courseId } = await params;

  const job = await prisma.courseGenerationJob.findFirst({
    where: {
      courseId,
      course: { ownerId: user.id },
    },
    select: {
      status: true,
      stage: true,
      errorMessage: true,
      updatedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ status: "NOT_STARTED", stage: "PREPARING" });
  }

  return NextResponse.json(job);
}
