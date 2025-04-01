/*
 Warnings:
 
 - Added the required column `total_marks` to the `exams` table without a default value. This is not possible if the table is not empty.
 
 */
-- AlterTable
ALTER TABLE
  "exams"
ADD
  COLUMN "total_marks" INTEGER NOT NULL;