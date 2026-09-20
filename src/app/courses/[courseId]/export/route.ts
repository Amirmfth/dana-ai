import { getCurrentUser } from "@/lib/auth/server";
import { courseToStructure } from "@/lib/courses/management";

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { courseId } = await context.params;

  try {
    const structure = await courseToStructure(user.id, courseId);
    const safeName = structure.course.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "course";

    return new Response(JSON.stringify(structure, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="' + safeName + '-curriculum.json"',
      },
    });
  } catch {
    return Response.json({ error: "Course not found." }, { status: 404 });
  }
}
