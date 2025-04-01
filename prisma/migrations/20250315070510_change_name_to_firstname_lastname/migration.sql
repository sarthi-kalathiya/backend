/*
 Warnings:
 
 - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
 
 */
-- Add temporary columns
ALTER TABLE
  "users"
ADD
  COLUMN "first_name" TEXT;

ALTER TABLE
  "users"
ADD
  COLUMN "last_name" TEXT;

-- Copy data from name to first_name for existing users
UPDATE
  "users"
SET
  "first_name" = "name",
  "last_name" = '';

-- Make the columns required after data migration
ALTER TABLE
  "users"
ALTER COLUMN
  "first_name"
SET
  NOT NULL;

ALTER TABLE
  "users"
ALTER COLUMN
  "last_name"
SET
  NOT NULL;

-- Drop the old column
ALTER TABLE
  "users" DROP COLUMN "name";