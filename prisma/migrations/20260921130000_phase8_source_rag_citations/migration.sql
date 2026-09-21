-- Phase 8: source-grounded courses, pgvector RAG, private source files, and lesson citations.

ALTER TYPE "AiOperation" ADD VALUE IF NOT EXISTS 'SOURCE_INGESTION';

CREATE TYPE "SourceType" AS ENUM ('PDF', 'TEXT', 'URL');
CREATE TYPE "SourceStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

CREATE TABLE "CourseSource" (
  "id" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "courseId" TEXT,
  "type" "SourceType" NOT NULL,
  "status" "SourceStatus" NOT NULL DEFAULT 'PROCESSING',
  "title" TEXT NOT NULL,
  "originalUrl" TEXT,
  "storagePath" TEXT,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseSource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseSource_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CourseSource_ownerId_updatedAt_idx"
  ON "CourseSource"("ownerId", "updatedAt");
CREATE INDEX "CourseSource_courseId_updatedAt_idx"
  ON "CourseSource"("courseId", "updatedAt");
CREATE INDEX "CourseSource_status_updatedAt_idx"
  ON "CourseSource"("status", "updatedAt");

CREATE TABLE "SourceChunk" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "pageStart" INTEGER,
  "pageEnd" INTEGER,
  "heading" TEXT,
  "metadata" JSONB,
  "embedding" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SourceChunk_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "CourseSource"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SourceChunk_sourceId_chunkIndex_key"
  ON "SourceChunk"("sourceId", "chunkIndex");
CREATE INDEX "SourceChunk_sourceId_idx"
  ON "SourceChunk"("sourceId");

CREATE TABLE "LessonCitation" (
  "id" TEXT NOT NULL,
  "lessonContentVersionId" TEXT NOT NULL,
  "sourceChunkId" TEXT NOT NULL,
  "marker" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonCitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonCitation_lessonContentVersionId_fkey"
    FOREIGN KEY ("lessonContentVersionId") REFERENCES "LessonContentVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonCitation_sourceChunkId_fkey"
    FOREIGN KEY ("sourceChunkId") REFERENCES "SourceChunk"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LessonCitation_lessonContentVersionId_sourceChunkId_marker_key"
  ON "LessonCitation"("lessonContentVersionId", "sourceChunkId", "marker");
CREATE INDEX "LessonCitation_lessonContentVersionId_idx"
  ON "LessonCitation"("lessonContentVersionId");
CREATE INDEX "LessonCitation_sourceChunkId_idx"
  ON "LessonCitation"("sourceChunkId");


