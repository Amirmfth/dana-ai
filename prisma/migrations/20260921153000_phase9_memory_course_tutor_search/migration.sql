-- Phase 9: learner memory controls and course-wide tutor conversations.

CREATE TYPE "ConversationScope" AS ENUM ('LESSON', 'COURSE');

ALTER TABLE "Conversation"
  ADD COLUMN "courseId" TEXT,
  ADD COLUMN "scope" "ConversationScope" NOT NULL DEFAULT 'LESSON';

UPDATE "Conversation" c
SET "courseId" = m."courseId"
FROM "Lesson" l
JOIN "Module" m ON m."id" = l."moduleId"
WHERE c."lessonId" = l."id";

ALTER TABLE "Conversation"
  ALTER COLUMN "courseId" SET NOT NULL,
  ALTER COLUMN "lessonId" DROP NOT NULL;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Conversation_lessonId_idx";
CREATE INDEX "Conversation_courseId_scope_updatedAt_idx"
  ON "Conversation"("courseId", "scope", "updatedAt");
CREATE INDEX "Conversation_lessonId_updatedAt_idx"
  ON "Conversation"("lessonId", "updatedAt");

ALTER TABLE "CourseMemory"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "UserPrivacySettings"
  ADD COLUMN "useLearnerMemory" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_scope_target_check"
  CHECK (
    ("scope" = 'LESSON' AND "lessonId" IS NOT NULL)
    OR
    ("scope" = 'COURSE' AND "lessonId" IS NULL)
  );
