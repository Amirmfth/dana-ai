export async function POST() {
  return Response.json(
    {
      error:
        "Per-question grading is disabled. Submit the complete quiz through /api/exercises/submit.",
    },
    { status: 410 },
  );
}
