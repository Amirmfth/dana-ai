CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "CourseMemory"
ADD COLUMN "embedding" vector(1536);