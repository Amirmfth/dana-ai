CREATE TYPE "CourseMode" AS ENUM ('GUIDED', 'FLEXIBLE');
CREATE TYPE "ReadingTheme" AS ENUM ('DEFAULT', 'PAPER', 'SEPIA', 'DARK', 'HIGH_CONTRAST');

ALTER TABLE "Course"
ADD COLUMN "mode" "CourseMode" NOT NULL DEFAULT 'GUIDED';

ALTER TABLE "UserExperienceSettings"
ADD COLUMN "readingTheme" "ReadingTheme" NOT NULL DEFAULT 'DEFAULT';

ALTER TABLE "GenerationJob"
ADD COLUMN "stage" TEXT;

CREATE TABLE "CourseGenerationJob" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" "GenerationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "stage" TEXT NOT NULL DEFAULT 'PREPARING',
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseGenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseGenerationJob_courseId_key" ON "CourseGenerationJob"("courseId");
CREATE INDEX "CourseGenerationJob_status_updatedAt_idx" ON "CourseGenerationJob"("status", "updatedAt");

ALTER TABLE "CourseGenerationJob"
ADD CONSTRAINT "CourseGenerationJob_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
