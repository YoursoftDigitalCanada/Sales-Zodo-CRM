ALTER TABLE "Employee"
ADD COLUMN "employmentStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'full-time',
ADD COLUMN "salary" DOUBLE PRECISION,
ADD COLUMN "profileData" JSONB NOT NULL DEFAULT '{}';

UPDATE "Employee"
SET "employmentStatus" = 'inactive'
WHERE "isActive" = false;
