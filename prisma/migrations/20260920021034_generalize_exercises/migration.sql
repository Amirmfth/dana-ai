/*
  Warnings:

  - You are about to drop the column `correctAnswer` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `Exercise` table. All the data in the column will be lost.
  - Added the required column `answerKey` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `answer` on the `ExerciseAttempt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExerciseType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "ExerciseType" ADD VALUE 'MULTIPLE_SELECT';
ALTER TYPE "ExerciseType" ADD VALUE 'MATCHING';
ALTER TYPE "ExerciseType" ADD VALUE 'ORDERING';

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "correctAnswer",
DROP COLUMN "options",
ADD COLUMN     "answerKey" JSONB NOT NULL,
ADD COLUMN     "data" JSONB NOT NULL,
ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExerciseAttempt" DROP COLUMN "answer",
ADD COLUMN     "answer" JSONB NOT NULL;
