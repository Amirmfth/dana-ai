-- Restore the pgvector column used by semantic course-memory retrieval.
-- Existing migrations may already have removed it, so this must remain a
-- forward-only migration rather than changing migration history.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "CourseMemory"
ADD COLUMN "embedding" vector(1536);
