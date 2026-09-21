-- Phase 11: language, accessibility, and reading preferences

ALTER TABLE "Course" ADD COLUMN "contentLanguage" TEXT NOT NULL DEFAULT 'English';

CREATE TYPE "ReadingFontSize" AS ENUM ('SMALL', 'DEFAULT', 'LARGE', 'EXTRA_LARGE');
CREATE TYPE "ReadingDensity" AS ENUM ('COMPACT', 'COMFORTABLE', 'SPACIOUS');
CREATE TYPE "ReadingLineHeight" AS ENUM ('TIGHT', 'NORMAL', 'RELAXED');
CREATE TYPE "ReadingWidth" AS ENUM ('NARROW', 'STANDARD', 'WIDE');
CREATE TYPE "MotionPreference" AS ENUM ('SYSTEM', 'REDUCED', 'FULL');

CREATE TABLE "UserExperienceSettings" (
  "userId" UUID NOT NULL,
  "uiLanguage" TEXT NOT NULL DEFAULT 'English',
  "defaultContentLanguage" TEXT NOT NULL DEFAULT 'English',
  "tutorLanguage" TEXT NOT NULL DEFAULT 'English',
  "fontSize" "ReadingFontSize" NOT NULL DEFAULT 'DEFAULT',
  "lineHeight" "ReadingLineHeight" NOT NULL DEFAULT 'NORMAL',
  "readingWidth" "ReadingWidth" NOT NULL DEFAULT 'STANDARD',
  "readingDensity" "ReadingDensity" NOT NULL DEFAULT 'COMFORTABLE',
  "motionPreference" "MotionPreference" NOT NULL DEFAULT 'SYSTEM',
  "highContrast" BOOLEAN NOT NULL DEFAULT false,
  "dyslexiaFriendly" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserExperienceSettings_pkey" PRIMARY KEY ("userId")
);
