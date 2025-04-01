-- Add credits column to subjects table
ALTER TABLE
    "subjects"
ADD
    COLUMN "credits" INTEGER NOT NULL DEFAULT 3;