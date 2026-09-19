-- CreateEnum
CREATE TYPE "AiOperation" AS ENUM ('COURSE_GENERATION', 'LESSON_GENERATION', 'TUTOR', 'MEMORY_EXTRACTION', 'EMBEDDING');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "operation" "AiOperation" NOT NULL,
    "status" "AiRequestStatus" NOT NULL,
    "model" TEXT NOT NULL,
    "providerResponseId" TEXT,
    "input" JSONB,
    "output" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "cachedInputTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_operation_createdAt_idx" ON "AiUsage"("operation", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_model_createdAt_idx" ON "AiUsage"("model", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_courseId_createdAt_idx" ON "AiUsage"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_lessonId_createdAt_idx" ON "AiUsage"("lessonId", "createdAt");
