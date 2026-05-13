CREATE TABLE "WebsiteAnalyticsIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "secretConfig" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteAnalyticsIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteAnalyticsWebhookDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteAnalyticsWebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteAnalyticsIntegration_tenantId_idx" ON "WebsiteAnalyticsIntegration"("tenantId");
CREATE INDEX "WebsiteAnalyticsIntegration_siteId_idx" ON "WebsiteAnalyticsIntegration"("siteId");
CREATE INDEX "WebsiteAnalyticsIntegration_provider_idx" ON "WebsiteAnalyticsIntegration"("provider");
CREATE INDEX "WebsiteAnalyticsIntegration_status_idx" ON "WebsiteAnalyticsIntegration"("status");
CREATE INDEX "WebsiteAnalyticsIntegration_tenantId_siteId_idx" ON "WebsiteAnalyticsIntegration"("tenantId", "siteId");
CREATE INDEX "WebsiteAnalyticsWebhookDelivery_tenantId_idx" ON "WebsiteAnalyticsWebhookDelivery"("tenantId");
CREATE INDEX "WebsiteAnalyticsWebhookDelivery_integrationId_idx" ON "WebsiteAnalyticsWebhookDelivery"("integrationId");
CREATE INDEX "WebsiteAnalyticsWebhookDelivery_eventType_idx" ON "WebsiteAnalyticsWebhookDelivery"("eventType");
CREATE INDEX "WebsiteAnalyticsWebhookDelivery_status_idx" ON "WebsiteAnalyticsWebhookDelivery"("status");
CREATE INDEX "WebsiteAnalyticsWebhookDelivery_tenantId_integrationId_idx" ON "WebsiteAnalyticsWebhookDelivery"("tenantId", "integrationId");

ALTER TABLE "WebsiteAnalyticsIntegration" ADD CONSTRAINT "WebsiteAnalyticsIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAnalyticsIntegration" ADD CONSTRAINT "WebsiteAnalyticsIntegration_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAnalyticsWebhookDelivery" ADD CONSTRAINT "WebsiteAnalyticsWebhookDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAnalyticsWebhookDelivery" ADD CONSTRAINT "WebsiteAnalyticsWebhookDelivery_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "WebsiteAnalyticsIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
