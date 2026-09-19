-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('MISCONCEPTION', 'WEAKNESS', 'STRENGTH', 'PREFERENCE', 'LEARNING_NOTE');

-- CreateTable
CREATE TABLE "CourseMemory" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "type" "MemoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseMemory_courseId_idx" ON "CourseMemory"("courseId");

-- CreateIndex
CREATE INDEX "CourseMemory_lessonId_idx" ON "CourseMemory"("lessonId");

-- CreateIndex
CREATE INDEX "CourseMemory_courseId_type_idx" ON "CourseMemory"("courseId", "type");

-- AddForeignKey
ALTER TABLE "CourseMemory" ADD CONSTRAINT "CourseMemory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseMemory" ADD CONSTRAINT "CourseMemory_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
