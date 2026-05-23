ALTER TABLE "BookkeepingReconciliation"
ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
