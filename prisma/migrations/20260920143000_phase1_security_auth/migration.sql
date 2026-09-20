-- Phase 1: authentication ownership, usage safety, privacy controls and RLS.
-- Existing application rows are intentionally discarded because they are test data.

TRUNCATE TABLE "Course", "AiUsage" CASCADE;

ALTER TABLE "Course"
  ADD COLUMN "ownerId" UUID NOT NULL;

ALTER TABLE "AiUsage"
  ADD COLUMN "userId" UUID NOT NULL;

ALTER TABLE "Course"
  ADD CONSTRAINT "Course_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES auth.users(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiUsage"
  ADD CONSTRAINT "AiUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Course_ownerId_updatedAt_idx"
  ON "Course"("ownerId", "updatedAt");

CREATE INDEX "AiUsage_userId_createdAt_idx"
  ON "AiUsage"("userId", "createdAt");

CREATE TABLE "AiRequestWindow" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "operation" "AiOperation" NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AiRequestWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiRequestWindow_scopeKey_operation_windowStart_key"
  ON "AiRequestWindow"("scopeKey", "operation", "windowStart");

CREATE INDEX "AiRequestWindow_windowStart_idx"
  ON "AiRequestWindow"("windowStart");

CREATE TABLE "UserPrivacySettings" (
  "userId" UUID NOT NULL,
  "storeAiPayloads" BOOLEAN NOT NULL DEFAULT false,
  "retentionDays" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPrivacySettings_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserPrivacySettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserPrivacySettings_retentionDays_check"
    CHECK ("retentionDays" IN (7, 30, 90))
);

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExerciseAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRequestWindow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPrivacySettings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
REVOKE ALL ON TABLE "AiRequestWindow" FROM anon, authenticated;

CREATE POLICY "Users can read own courses"
ON "Course" FOR SELECT TO authenticated
USING ((select auth.uid()) = "ownerId");

CREATE POLICY "Users can read own modules"
ON "Module" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Course"
  WHERE "Course"."id" = "Module"."courseId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own lessons"
ON "Lesson" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Module"
  JOIN "Course" ON "Course"."id" = "Module"."courseId"
  WHERE "Module"."id" = "Lesson"."moduleId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own lesson content"
ON "LessonContent" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Lesson"
  JOIN "Module" ON "Module"."id" = "Lesson"."moduleId"
  JOIN "Course" ON "Course"."id" = "Module"."courseId"
  WHERE "Lesson"."id" = "LessonContent"."lessonId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own conversations"
ON "Conversation" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Lesson"
  JOIN "Module" ON "Module"."id" = "Lesson"."moduleId"
  JOIN "Course" ON "Course"."id" = "Module"."courseId"
  WHERE "Lesson"."id" = "Conversation"."lessonId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own messages"
ON "Message" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Conversation"
  JOIN "Lesson" ON "Lesson"."id" = "Conversation"."lessonId"
  JOIN "Module" ON "Module"."id" = "Lesson"."moduleId"
  JOIN "Course" ON "Course"."id" = "Module"."courseId"
  WHERE "Conversation"."id" = "Message"."conversationId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own memories"
ON "CourseMemory" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Course"
  WHERE "Course"."id" = "CourseMemory"."courseId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own AI usage"
ON "AiUsage" FOR SELECT TO authenticated
USING ((select auth.uid()) = "userId");

CREATE POLICY "Users can read own exercises"
ON "Exercise" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Lesson"
  JOIN "Module" ON "Module"."id" = "Lesson"."moduleId"
  JOIN "Course" ON "Course"."id" = "Module"."courseId"
  WHERE "Lesson"."id" = "Exercise"."lessonId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own exercise attempts"
ON "ExerciseAttempt" FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "Exercise"
  JOIN "Lesson" ON "Lesson"."id" = "Exercise"."lessonId"
  JOIN "Module" ON "Module"."id" = "Lesson"."moduleId"
  JOIN "Course" ON "Course"."id" = "Module"."courseId"
  WHERE "Exercise"."id" = "ExerciseAttempt"."exerciseId"
    AND "Course"."ownerId" = (select auth.uid())
));

CREATE POLICY "Users can read own privacy settings"
ON "UserPrivacySettings" FOR SELECT TO authenticated
USING ((select auth.uid()) = "userId");

CREATE POLICY "Users can insert own privacy settings"
ON "UserPrivacySettings" FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = "userId");

CREATE POLICY "Users can update own privacy settings"
ON "UserPrivacySettings" FOR UPDATE TO authenticated
USING ((select auth.uid()) = "userId")
WITH CHECK ((select auth.uid()) = "userId");
