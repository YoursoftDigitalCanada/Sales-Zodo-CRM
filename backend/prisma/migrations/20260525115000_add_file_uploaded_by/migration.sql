ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;

CREATE INDEX IF NOT EXISTS "File_uploadedById_idx" ON "File"("uploadedById");
