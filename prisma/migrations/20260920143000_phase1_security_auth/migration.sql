-- Phase 1 application schema changes.
-- Supabase Auth foreign keys and RLS are managed separately.

-- Existing rows are test data and may be discarded.
TRUNCATE TABLE "Course", "AiUsage" CASCADE;

ALTER TABLE "Course"
  ADD COLUMN "ownerId" UUID NOT NULL;

ALTER TABLE "AiUsage"
  ADD COLUMN "userId" UUID NOT NULL;

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

  CONSTRAINT "UserPrivacySettings_retentionDays_check"
    CHECK ("retentionDays" IN (7, 30, 90))
);