/*
 Warnings:
 
 - Added the required column `end_date` to the `exams` table without a default value. This is not possible if the table is not empty.
 - Added the required column `start_date` to the `exams` table without a default value. This is not possible if the table is not empty.
 
 */
-- AlterTable
ALTER TABLE
  "exams"
ADD
  COLUMN "end_date" TIMESTAMP(3) NOT NULL,
ADD
  COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD
  COLUMN "start_date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE
  "questions"
ADD
  COLUMN "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD
  COLUMN "negative_marks" DOUBLE PRECISION NOT NULL DEFAULT 0;