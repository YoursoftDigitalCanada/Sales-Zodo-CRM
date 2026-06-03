-- Add form-builder source type without breaking existing lead sources.
ALTER TYPE "LeadSourceType" ADD VALUE IF NOT EXISTS 'FORM_BUILDER';

CREATE TYPE "FormBuilderFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "FormBuilderDuplicateHandling" AS ENUM ('CREATE_NEW', 'UPDATE_EXISTING', 'IGNORE', 'FLAG_DUPLICATE');
CREATE TYPE "FormBuilderSubmissionStatus" AS ENUM ('RECEIVED', 'LEAD_CREATED', 'DUPLICATE', 'FAILED', 'DELETED');

CREATE TABLE "FormBuilderForm" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadSourceId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "FormBuilderFormStatus" NOT NULL DEFAULT 'DRAFT',
  "thankYouMessage" TEXT NOT NULL DEFAULT 'Thanks for your submission. We will be in touch soon.',
  "redirectUrl" TEXT,
  "slug" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "fields" JSONB NOT NULL DEFAULT '[]',
  "settings" JSONB NOT NULL DEFAULT '{}',
  "spamProtection" JSONB NOT NULL DEFAULT '{}',
  "notificationEmails" JSONB NOT NULL DEFAULT '[]',
  "assignmentRules" JSONB NOT NULL DEFAULT '{}',
  "duplicateHandling" "FormBuilderDuplicateHandling" NOT NULL DEFAULT 'FLAG_DUPLICATE',
  "submissionLimit" INTEGER,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "submissionCount" INTEGER NOT NULL DEFAULT 0,
  "conversionRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "FormBuilderForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormBuilderSubmission" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "leadId" TEXT,
  "status" "FormBuilderSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
  "submittedData" JSONB NOT NULL DEFAULT '{}',
  "mappedLeadData" JSONB NOT NULL DEFAULT '{}',
  "unmappedData" JSONB NOT NULL DEFAULT '{}',
  "tracking" JSONB NOT NULL DEFAULT '{}',
  "spamScore" DECIMAL(5,2),
  "spamVerdict" TEXT,
  "ipAddressHash" TEXT,
  "userAgent" TEXT,
  "referrerUrl" TEXT,
  "landingPageUrl" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "FormBuilderSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormBuilderForm_publicId_key" ON "FormBuilderForm"("publicId");
CREATE UNIQUE INDEX "FormBuilderForm_tenantId_slug_key" ON "FormBuilderForm"("tenantId", "slug");
CREATE UNIQUE INDEX "FormBuilderForm_id_tenantId_key" ON "FormBuilderForm"("id", "tenantId");
CREATE INDEX "FormBuilderForm_tenantId_idx" ON "FormBuilderForm"("tenantId");
CREATE INDEX "FormBuilderForm_leadSourceId_idx" ON "FormBuilderForm"("leadSourceId");
CREATE INDEX "FormBuilderForm_status_idx" ON "FormBuilderForm"("status");
CREATE INDEX "FormBuilderForm_createdAt_idx" ON "FormBuilderForm"("createdAt");
CREATE INDEX "FormBuilderForm_publicId_idx" ON "FormBuilderForm"("publicId");
CREATE INDEX "FormBuilderForm_deletedAt_idx" ON "FormBuilderForm"("deletedAt");

CREATE INDEX "FormBuilderSubmission_tenantId_idx" ON "FormBuilderSubmission"("tenantId");
CREATE INDEX "FormBuilderSubmission_formId_idx" ON "FormBuilderSubmission"("formId");
CREATE INDEX "FormBuilderSubmission_tenantId_status_idx" ON "FormBuilderSubmission"("tenantId", "status");
CREATE INDEX "FormBuilderSubmission_tenantId_createdAt_idx" ON "FormBuilderSubmission"("tenantId", "createdAt");
CREATE INDEX "FormBuilderSubmission_formId_submittedAt_idx" ON "FormBuilderSubmission"("formId", "submittedAt");
CREATE INDEX "FormBuilderSubmission_leadId_idx" ON "FormBuilderSubmission"("leadId");
CREATE INDEX "FormBuilderSubmission_deletedAt_idx" ON "FormBuilderSubmission"("deletedAt");

ALTER TABLE "FormBuilderForm"
  ADD CONSTRAINT "FormBuilderForm_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormBuilderForm"
  ADD CONSTRAINT "FormBuilderForm_leadSourceId_fkey"
  FOREIGN KEY ("leadSourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FormBuilderForm"
  ADD CONSTRAINT "FormBuilderForm_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FormBuilderSubmission"
  ADD CONSTRAINT "FormBuilderSubmission_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormBuilderSubmission"
  ADD CONSTRAINT "FormBuilderSubmission_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "FormBuilderForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormBuilderSubmission"
  ADD CONSTRAINT "FormBuilderSubmission_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
