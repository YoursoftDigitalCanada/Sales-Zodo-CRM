ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "leadType" TEXT,
  ADD COLUMN IF NOT EXISTS "buyingIntent" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseTimeline" TEXT,
  ADD COLUMN IF NOT EXISTS "productInterest" TEXT,
  ADD COLUMN IF NOT EXISTS "numberOfUsers" INTEGER,
  ADD COLUMN IF NOT EXISTS "currentSolution" TEXT,
  ADD COLUMN IF NOT EXISTS "teamRegion" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT;

UPDATE "Lead"
SET "purchaseTimeline" = COALESCE("purchaseTimeline", "workTimeline"),
    "productInterest" = COALESCE("productInterest", "serviceType"),
    "buyingIntent" = COALESCE("buyingIntent",
      CASE
        WHEN "temperature" = 'HOT' THEN 'High'
        WHEN "temperature" = 'COLD' THEN 'Low'
        ELSE 'Medium'
      END
    ),
    "teamRegion" = COALESCE("teamRegion", "territory")
WHERE "purchaseTimeline" IS NULL
   OR "productInterest" IS NULL
   OR "buyingIntent" IS NULL
   OR "teamRegion" IS NULL;

CREATE INDEX IF NOT EXISTS "Lead_leadType_idx" ON "Lead"("leadType");
CREATE INDEX IF NOT EXISTS "Lead_buyingIntent_idx" ON "Lead"("buyingIntent");
CREATE INDEX IF NOT EXISTS "Lead_purchaseTimeline_idx" ON "Lead"("purchaseTimeline");
CREATE INDEX IF NOT EXISTS "Lead_productInterest_idx" ON "Lead"("productInterest");
CREATE INDEX IF NOT EXISTS "Lead_teamRegion_idx" ON "Lead"("teamRegion");
