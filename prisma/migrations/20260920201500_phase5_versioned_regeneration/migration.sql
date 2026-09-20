-- Phase 5: immutable generation history and safe regeneration.

CREATE TYPE "RegenerationTarget" AS ENUM (
  'LESSON_CONTENT',
  'LESSON_QUIZ',
  'CURRICULUM',
  'MODULE'
);

CREATE TYPE "CurriculumRevisionScope" AS ENUM ('COURSE', 'MODULE');
CREATE TYPE "CurriculumRevisionStatus" AS ENUM ('DRAFT', 'APPLIED');

CREATE TABLE "LessonContentVersion" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonContentVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonContentVersion_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LessonContentVersion_lessonId_version_key"
  ON "LessonContentVersion"("lessonId", "version");
CREATE INDEX "LessonContentVersion_lessonId_createdAt_idx"
  ON "LessonContentVersion"("lessonId", "createdAt");

ALTER TABLE "Lesson"
  ADD COLUMN "activeContentVersionId" TEXT;

INSERT INTO "LessonContentVersion" (
  "id", "lessonId", "version", "content", "createdAt"
)
SELECT
  'content-version:' || lc."id",
  lc."lessonId",
  GREATEST(lc."generationVersion", 1),
  lc."content",
  lc."generatedAt"
FROM "LessonContent" lc;

UPDATE "Lesson" l
SET "activeContentVersionId" = lcv."id"
FROM "LessonContentVersion" lcv
WHERE lcv."lessonId" = l."id";

CREATE UNIQUE INDEX "Lesson_activeContentVersionId_key"
  ON "Lesson"("activeContentVersionId");

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_activeContentVersionId_fkey"
  FOREIGN KEY ("activeContentVersionId") REFERENCES "LessonContentVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QuizVersion" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuizVersion_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "QuizVersion_lessonId_version_key"
  ON "QuizVersion"("lessonId", "version");
CREATE INDEX "QuizVersion_lessonId_createdAt_idx"
  ON "QuizVersion"("lessonId", "createdAt");

ALTER TABLE "Lesson"
  ADD COLUMN "activeQuizVersionId" TEXT;

INSERT INTO "QuizVersion" ("id", "lessonId", "version", "createdAt")
SELECT
  'quiz-version:' || l."id",
  l."id",
  1,
  COALESCE(MIN(e."createdAt"), CURRENT_TIMESTAMP)
FROM "Lesson" l
JOIN "Exercise" e ON e."lessonId" = l."id"
GROUP BY l."id";

UPDATE "Lesson" l
SET "activeQuizVersionId" = qv."id"
FROM "QuizVersion" qv
WHERE qv."lessonId" = l."id" AND qv."version" = 1;

CREATE UNIQUE INDEX "Lesson_activeQuizVersionId_key"
  ON "Lesson"("activeQuizVersionId");

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_activeQuizVersionId_fkey"
  FOREIGN KEY ("activeQuizVersionId") REFERENCES "QuizVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exercise"
  ADD COLUMN "quizVersionId" TEXT;

UPDATE "Exercise" e
SET "quizVersionId" = qv."id"
FROM "QuizVersion" qv
WHERE qv."lessonId" = e."lessonId" AND qv."version" = 1;

ALTER TABLE "Exercise"
  ALTER COLUMN "quizVersionId" SET NOT NULL;

ALTER TABLE "Exercise"
  ADD CONSTRAINT "Exercise_quizVersionId_fkey"
  FOREIGN KEY ("quizVersionId") REFERENCES "QuizVersion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Exercise_lessonId_order_key";
CREATE UNIQUE INDEX "Exercise_quizVersionId_order_key"
  ON "Exercise"("quizVersionId", "order");
CREATE INDEX "Exercise_quizVersionId_idx"
  ON "Exercise"("quizVersionId");

ALTER TABLE "QuizRun"
  ADD COLUMN "quizVersionId" TEXT;

UPDATE "QuizRun" qr
SET "quizVersionId" = qv."id"
FROM "QuizVersion" qv
WHERE qv."lessonId" = qr."lessonId" AND qv."version" = 1;

-- Lessons without exercises should not have quiz runs in the current application.
DELETE FROM "QuizRun" WHERE "quizVersionId" IS NULL;

ALTER TABLE "QuizRun"
  ALTER COLUMN "quizVersionId" SET NOT NULL;

ALTER TABLE "QuizRun"
  ADD CONSTRAINT "QuizRun_quizVersionId_fkey"
  FOREIGN KEY ("quizVersionId") REFERENCES "QuizVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "QuizRun_quizVersionId_startedAt_idx"
  ON "QuizRun"("quizVersionId", "startedAt");

CREATE TABLE "RegenerationLock" (
  "id" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "target" "RegenerationTarget" NOT NULL,
  "targetId" TEXT NOT NULL,
  "status" "GenerationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "claimToken" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegenerationLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegenerationLock_target_targetId_key"
  ON "RegenerationLock"("target", "targetId");
CREATE INDEX "RegenerationLock_ownerId_updatedAt_idx"
  ON "RegenerationLock"("ownerId", "updatedAt");

CREATE TABLE "CurriculumRevision" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "moduleId" TEXT,
  "scope" "CurriculumRevisionScope" NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "CurriculumRevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "instructions" TEXT,
  "structure" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  CONSTRAINT "CurriculumRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CurriculumRevision_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CurriculumRevision_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "Module"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CurriculumRevision_courseId_createdAt_idx"
  ON "CurriculumRevision"("courseId", "createdAt");
CREATE INDEX "CurriculumRevision_moduleId_createdAt_idx"
  ON "CurriculumRevision"("moduleId", "createdAt");
CREATE INDEX "CurriculumRevision_courseId_scope_version_idx"
  ON "CurriculumRevision"("courseId", "scope", "version");

ALTER TABLE "LessonContentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegenerationLock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumRevision" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "LessonContentVersion" FROM anon, authenticated;
REVOKE ALL ON TABLE "QuizVersion" FROM anon, authenticated;
REVOKE ALL ON TABLE "RegenerationLock" FROM anon, authenticated;
REVOKE ALL ON TABLE "CurriculumRevision" FROM anon, authenticated;
