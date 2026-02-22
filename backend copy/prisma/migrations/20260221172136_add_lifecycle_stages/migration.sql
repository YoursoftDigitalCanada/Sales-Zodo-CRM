-- CreateEnum
CREATE TYPE "LeadLifecycleStage" AS ENUM ('SUBSCRIBER', 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "ClientLifecycleStage" AS ENUM ('NEW_CUSTOMER', 'ONBOARDING', 'ACTIVE', 'AT_RISK', 'CHURNED', 'RE_ENGAGED', 'VIP');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "lifecycleStage" "ClientLifecycleStage" NOT NULL DEFAULT 'NEW_CUSTOMER';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lifecycleStage" "LeadLifecycleStage" NOT NULL DEFAULT 'LEAD';
