-- Phase 3: reusable course templates.

CREATE TABLE "CourseTemplate" (
  "id" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "sourceCourseId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "structure" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CourseTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseTemplate_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES auth.users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CourseTemplate_sourceCourseId_fkey"
    FOREIGN KEY ("sourceCourseId") REFERENCES "Course"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CourseTemplate_ownerId_updatedAt_idx"
  ON "CourseTemplate"("ownerId", "updatedAt");

CREATE INDEX "CourseTemplate_sourceCourseId_idx"
  ON "CourseTemplate"("sourceCourseId");

ALTER TABLE "CourseTemplate" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CourseTemplate" FROM anon, authenticated;
