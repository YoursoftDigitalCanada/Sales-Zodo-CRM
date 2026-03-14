-- Migration: Add wizard workflow fields to RoofEstimate
-- Safe for existing data: all new columns use DEFAULT or allow NULL

-- Wizard Workflow
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "currentStep" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "wastePercent" DOUBLE PRECISION DEFAULT 10;

-- Step 2: Material Pricing
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "shingleType" TEXT;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "shinglePricePerSq" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "underlaymentCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "iceWaterShieldCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "ridgeCapCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "starterStripCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "flashingCostWizard" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "ventCostWizard" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "nailsAccessoriesCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "totalMaterialCost" DOUBLE PRECISION;

-- Step 3: Labor
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "laborCostPerSquare" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "numberOfLaborers" INTEGER;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "daysRequired" INTEGER;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "laborRatePerWorker" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "totalLaborCost" DOUBLE PRECISION;

-- Step 4: Equipment / Extras
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "dumpsterCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "permitCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "equipmentRentalCost" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "disposalFee" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "totalEquipmentCost" DOUBLE PRECISION;

-- Step 5: Profit & Overhead
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "overheadPercent" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "profitMarginPercent" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "taxPercent" DOUBLE PRECISION;

-- Step 6: Final calculations
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "overheadAmount" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "profitAmount" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION;
ALTER TABLE "RoofEstimate" ADD COLUMN IF NOT EXISTS "finalEstimatePrice" DOUBLE PRECISION;

-- Backfill existing estimates: mark them as completed since they were created before the wizard
UPDATE "RoofEstimate" SET "status" = 'completed', "currentStep" = 6 WHERE "status" = 'draft' AND "finalEstimatePrice" IS NULL;
