/*
 Warnings:
 
 - Added the required column `grade` to the `students` table without a default value. This is not possible if the table is not empty.
 - Added the required column `parent_contact_number` to the `students` table without a default value. This is not possible if the table is not empty.
 - Added the required column `roll_number` to the `students` table without a default value. This is not possible if the table is not empty.
 
 */
-- AlterTable
ALTER TABLE
  "students"
ADD
  COLUMN "grade" TEXT NOT NULL,
ADD
  COLUMN "parent_contact_number" TEXT NOT NULL,
ADD
  COLUMN "roll_number" TEXT NOT NULL;