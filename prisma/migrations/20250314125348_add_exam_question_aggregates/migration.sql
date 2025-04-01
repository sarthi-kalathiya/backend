-- AlterTable
ALTER TABLE
    "exams"
ADD
    COLUMN "current_question_count" INTEGER NOT NULL DEFAULT 0,
ADD
    COLUMN "current_total_marks" DOUBLE PRECISION NOT NULL DEFAULT 0;