-- Phase 2: durable generation coordination for lesson content and quizzes.

CREATE TYPE "GenerationKind" AS ENUM ('LESSON_CONTENT', 'LESSON_QUIZ');
CREATE TYPE "GenerationStatus" AS ENUM ('NOT_STARTED', 'GENERATING', 'READY', 'FAILED');

CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "kind" "GenerationKind" NOT NULL,
  "status" "GenerationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "claimToken" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GenerationJob_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GenerationJob_lessonId_kind_key"
  ON "GenerationJob"("lessonId", "kind");

CREATE INDEX "GenerationJob_status_updatedAt_idx"
  ON "GenerationJob"("status", "updatedAt");

INSERT INTO "GenerationJob" (
  "id", "lessonId", "kind", "status", "attemptCount",
  "completedAt", "createdAt", "updatedAt"
)
SELECT
  'content:' || l."id",
  l."id",
  'LESSON_CONTENT'::"GenerationKind",
  CASE
    WHEN lc."lessonId" IS NOT NULL THEN 'READY'::"GenerationStatus"
    ELSE 'NOT_STARTED'::"GenerationStatus"
  END,
  0,
  CASE WHEN lc."lessonId" IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Lesson" l
LEFT JOIN "LessonContent" lc ON lc."lessonId" = l."id";

INSERT INTO "GenerationJob" (
  "id", "lessonId", "kind", "status", "attemptCount",
  "completedAt", "createdAt", "updatedAt"
)
SELECT
  'quiz:' || l."id",
  l."id",
  'LESSON_QUIZ'::"GenerationKind",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "Exercise" e WHERE e."lessonId" = l."id"
    ) THEN 'READY'::"GenerationStatus"
    ELSE 'NOT_STARTED'::"GenerationStatus"
  END,
  0,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "Exercise" e WHERE e."lessonId" = l."id"
    ) THEN CURRENT_TIMESTAMP
    ELSE NULL
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Lesson" l;
