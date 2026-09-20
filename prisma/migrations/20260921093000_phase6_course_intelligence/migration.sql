-- Phase 6: course intelligence, prerequisite graph, and reusable assessments.

CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "LearningStyle" AS ENUM ('BALANCED', 'PRACTICAL', 'CONCEPTUAL', 'PROJECT_BASED');
CREATE TYPE "LessonDifficulty" AS ENUM ('INTRODUCTORY', 'EASY', 'MEDIUM', 'HARD', 'ADVANCED');
CREATE TYPE "CompletionMethod" AS ENUM ('STUDIED', 'TESTED_OUT', 'SKIPPED');
CREATE TYPE "AssessmentType" AS ENUM ('PLACEMENT', 'TEST_OUT', 'MODULE', 'COURSE_FINAL');

ALTER TABLE "Course"
  ADD COLUMN "currentLevel" "CourseLevel",
  ADD COLUMN "targetLevel" "CourseLevel",
  ADD COLUMN "weeklyStudyMinutes" INTEGER,
  ADD COLUMN "learningStyle" "LearningStyle";

ALTER TABLE "Lesson"
  ADD COLUMN "difficulty" "LessonDifficulty" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "isOptional" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "completionMethod" "CompletionMethod";

UPDATE "Lesson"
SET "completionMethod" = 'STUDIED'
WHERE "status" = 'COMPLETED' AND "completionMethod" IS NULL;

CREATE TABLE "LessonPrerequisite" (
  "lessonId" TEXT NOT NULL,
  "prerequisiteLessonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonPrerequisite_pkey" PRIMARY KEY ("lessonId", "prerequisiteLessonId"),
  CONSTRAINT "LessonPrerequisite_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonPrerequisite_prerequisiteLessonId_fkey"
    FOREIGN KEY ("prerequisiteLessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonPrerequisite_no_self" CHECK ("lessonId" <> "prerequisiteLessonId")
);

CREATE INDEX "LessonPrerequisite_prerequisiteLessonId_idx"
  ON "LessonPrerequisite"("prerequisiteLessonId");

WITH ordered AS (
  SELECT
    l."id",
    LAG(l."id") OVER (
      PARTITION BY m."courseId"
      ORDER BY m."order", l."order"
    ) AS previous_id
  FROM "Lesson" l
  JOIN "Module" m ON m."id" = l."moduleId"
)
INSERT INTO "LessonPrerequisite" ("lessonId", "prerequisiteLessonId")
SELECT "id", previous_id
FROM ordered
WHERE previous_id IS NOT NULL;

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "moduleId" TEXT,
  "lessonId" TEXT,
  "type" "AssessmentType" NOT NULL,
  "title" TEXT NOT NULL,
  "passingScore" INTEGER NOT NULL DEFAULT 80,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Assessment_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assessment_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "Module"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assessment_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assessment_passing_score" CHECK ("passingScore" BETWEEN 0 AND 100)
);

CREATE INDEX "Assessment_courseId_type_idx" ON "Assessment"("courseId", "type");
CREATE INDEX "Assessment_moduleId_type_idx" ON "Assessment"("moduleId", "type");
CREATE INDEX "Assessment_lessonId_type_idx" ON "Assessment"("lessonId", "type");

CREATE TABLE "AssessmentVersion" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssessmentVersion_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssessmentVersion_assessmentId_version_key"
  ON "AssessmentVersion"("assessmentId", "version");
CREATE INDEX "AssessmentVersion_assessmentId_createdAt_idx"
  ON "AssessmentVersion"("assessmentId", "createdAt");

CREATE TABLE "AssessmentQuestion" (
  "id" TEXT NOT NULL,
  "assessmentVersionId" TEXT NOT NULL,
  "targetLessonId" TEXT,
  "type" "ExerciseType" NOT NULL,
  "order" INTEGER NOT NULL,
  "question" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "answerKey" JSONB NOT NULL,
  "explanation" TEXT NOT NULL,
  "concepts" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssessmentQuestion_assessmentVersionId_fkey"
    FOREIGN KEY ("assessmentVersionId") REFERENCES "AssessmentVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssessmentQuestion_targetLessonId_fkey"
    FOREIGN KEY ("targetLessonId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssessmentQuestion_assessmentVersionId_order_key"
  ON "AssessmentQuestion"("assessmentVersionId", "order");
CREATE INDEX "AssessmentQuestion_targetLessonId_idx"
  ON "AssessmentQuestion"("targetLessonId");

CREATE TABLE "AssessmentRun" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "assessmentVersionId" TEXT NOT NULL,
  "score" INTEGER,
  "total" INTEGER,
  "passed" BOOLEAN,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AssessmentRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssessmentRun_assessmentVersionId_fkey"
    FOREIGN KEY ("assessmentVersionId") REFERENCES "AssessmentVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AssessmentRun_userId_startedAt_idx" ON "AssessmentRun"("userId", "startedAt");
CREATE INDEX "AssessmentRun_assessmentVersionId_startedAt_idx"
  ON "AssessmentRun"("assessmentVersionId", "startedAt");

CREATE TABLE "AssessmentAnswer" (
  "id" TEXT NOT NULL,
  "assessmentRunId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answer" JSONB NOT NULL,
  "result" "AttemptResult" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssessmentAnswer_assessmentRunId_fkey"
    FOREIGN KEY ("assessmentRunId") REFERENCES "AssessmentRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssessmentAnswer_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssessmentAnswer_assessmentRunId_questionId_key"
  ON "AssessmentAnswer"("assessmentRunId", "questionId");
CREATE INDEX "AssessmentAnswer_questionId_createdAt_idx"
  ON "AssessmentAnswer"("questionId", "createdAt");

