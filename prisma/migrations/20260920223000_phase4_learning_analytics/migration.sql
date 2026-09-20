-- Phase 4: learning analytics, assessment history, and study-time tracking.

CREATE TYPE "LearningEventType" AS ENUM (
  'LESSON_STARTED',
  'LESSON_COMPLETED',
  'QUIZ_COMPLETED'
);

CREATE TABLE "QuizRun" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "lessonId" TEXT NOT NULL,
  "score" INTEGER,
  "total" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "QuizRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuizRun_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "QuizRun_userId_startedAt_idx"
  ON "QuizRun"("userId", "startedAt");

CREATE INDEX "QuizRun_lessonId_startedAt_idx"
  ON "QuizRun"("lessonId", "startedAt");

CREATE TABLE "LearningEvent" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "courseId" TEXT NOT NULL,
  "lessonId" TEXT,
  "type" "LearningEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningEvent_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearningEvent_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "LearningEvent_userId_createdAt_idx"
  ON "LearningEvent"("userId", "createdAt");

CREATE INDEX "LearningEvent_courseId_createdAt_idx"
  ON "LearningEvent"("courseId", "createdAt");

CREATE INDEX "LearningEvent_lessonId_createdAt_idx"
  ON "LearningEvent"("lessonId", "createdAt");

CREATE TABLE "StudyTime" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "courseId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "seconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudyTime_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyTime_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudyTime_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudyTime_userId_lessonId_day_key"
  ON "StudyTime"("userId", "lessonId", "day");

CREATE INDEX "StudyTime_userId_day_idx"
  ON "StudyTime"("userId", "day");

CREATE INDEX "StudyTime_courseId_day_idx"
  ON "StudyTime"("courseId", "day");

ALTER TABLE "ExerciseAttempt" ADD COLUMN "quizRunId" TEXT;

INSERT INTO "QuizRun" (
  "id",
  "userId",
  "lessonId",
  "score",
  "total",
  "startedAt",
  "completedAt"
)
SELECT
  'legacy:' || l."id",
  c."ownerId",
  l."id",
  COUNT(*) FILTER (WHERE ea."result" = 'CORRECT')::INTEGER,
  COUNT(*)::INTEGER,
  MIN(ea."createdAt"),
  MAX(ea."createdAt")
FROM "ExerciseAttempt" ea
JOIN "Exercise" e ON e."id" = ea."exerciseId"
JOIN "Lesson" l ON l."id" = e."lessonId"
JOIN "Module" m ON m."id" = l."moduleId"
JOIN "Course" c ON c."id" = m."courseId"
GROUP BY l."id", c."ownerId";

UPDATE "ExerciseAttempt" ea
SET "quizRunId" = 'legacy:' || e."lessonId"
FROM "Exercise" e
WHERE e."id" = ea."exerciseId";

ALTER TABLE "ExerciseAttempt"
  ALTER COLUMN "quizRunId" SET NOT NULL;

ALTER TABLE "ExerciseAttempt"
  ADD CONSTRAINT "ExerciseAttempt_quizRunId_fkey"
  FOREIGN KEY ("quizRunId") REFERENCES "QuizRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ExerciseAttempt_quizRunId_createdAt_idx"
  ON "ExerciseAttempt"("quizRunId", "createdAt");