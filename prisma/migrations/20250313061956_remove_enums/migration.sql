/*
 Warnings:
 
 - The `status` column on the `student_exams` table would be dropped and recreated. This will lead to data loss if there is data in the column.
 - Changed the type of `event_type` on the `anti_cheating_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `status` on the `results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `role` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 
 */
-- AlterTable
ALTER TABLE
  "anti_cheating_logs" DROP COLUMN "event_type",
ADD
  COLUMN "event_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE
  "results" DROP COLUMN "status",
ADD
  COLUMN "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE
  "student_exams" DROP COLUMN "status",
ADD
  COLUMN "status" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE
  "users" DROP COLUMN "role",
ADD
  COLUMN "role" TEXT NOT NULL;

-- DropEnum
DROP TYPE "CheatingEventType";

-- DropEnum
DROP TYPE "ExamStatus";

-- DropEnum
DROP TYPE "ResultStatus";

-- DropEnum
DROP TYPE "UserRole";