/*
 Warnings:
 
 - Added the required column `bio` to the `teachers` table without a default value. This is not possible if the table is not empty.
 - Added the required column `expertise` to the `teachers` table without a default value. This is not possible if the table is not empty.
 - Added the required column `qualification` to the `teachers` table without a default value. This is not possible if the table is not empty.
 - Made the column `contact_number` on table `users` required. This step will fail if there are existing NULL values in that column.
 
 */
-- AlterTable
ALTER TABLE
  "teachers"
ADD
  COLUMN "bio" TEXT NOT NULL,
ADD
  COLUMN "expertise" TEXT NOT NULL,
ADD
  COLUMN "qualification" TEXT NOT NULL;

-- AlterTable
ALTER TABLE
  "users"
ALTER COLUMN
  "contact_number"
SET
  NOT NULL;