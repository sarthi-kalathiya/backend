/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `subjects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First, add the column without NOT NULL constraint
ALTER TABLE "subjects" ADD COLUMN "code" TEXT;

-- Update existing records to set code = 'SUB-' + id
UPDATE "subjects" SET "code" = CONCAT('SUB-', SUBSTRING(id, 1, 8)) WHERE "code" IS NULL;

-- Now add the NOT NULL constraint
ALTER TABLE "subjects" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");
