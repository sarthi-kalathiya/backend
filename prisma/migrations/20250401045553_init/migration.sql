-- AlterTable
ALTER TABLE
    "students"
ALTER COLUMN
    "grade" DROP NOT NULL,
ALTER COLUMN
    "parent_contact_number" DROP NOT NULL,
ALTER COLUMN
    "roll_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE
    "teachers"
ALTER COLUMN
    "bio" DROP NOT NULL,
ALTER COLUMN
    "expertise" DROP NOT NULL,
ALTER COLUMN
    "qualification" DROP NOT NULL;

-- AlterTable
ALTER TABLE
    "users"
ADD
    COLUMN "profile_completed" BOOLEAN NOT NULL DEFAULT false;