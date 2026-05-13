CREATE TABLE "WebsiteAiInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteAiInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteAiConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "title" TEXT,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteAiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteAiMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteAiInsight_tenantId_idx" ON "WebsiteAiInsight"("tenantId");
CREATE INDEX "WebsiteAiInsight_siteId_idx" ON "WebsiteAiInsight"("siteId");
CREATE INDEX "WebsiteAiInsight_type_idx" ON "WebsiteAiInsight"("type");
CREATE INDEX "WebsiteAiInsight_status_idx" ON "WebsiteAiInsight"("status");
CREATE INDEX "WebsiteAiInsight_sourceType_sourceId_idx" ON "WebsiteAiInsight"("sourceType", "sourceId");
CREATE INDEX "WebsiteAiInsight_tenantId_siteId_createdAt_idx" ON "WebsiteAiInsight"("tenantId", "siteId", "createdAt");
CREATE INDEX "WebsiteAiConversation_tenantId_idx" ON "WebsiteAiConversation"("tenantId");
CREATE INDEX "WebsiteAiConversation_siteId_idx" ON "WebsiteAiConversation"("siteId");
CREATE INDEX "WebsiteAiConversation_tenantId_siteId_createdAt_idx" ON "WebsiteAiConversation"("tenantId", "siteId", "createdAt");
CREATE INDEX "WebsiteAiMessage_tenantId_idx" ON "WebsiteAiMessage"("tenantId");
CREATE INDEX "WebsiteAiMessage_conversationId_idx" ON "WebsiteAiMessage"("conversationId");
CREATE INDEX "WebsiteAiMessage_tenantId_conversationId_idx" ON "WebsiteAiMessage"("tenantId", "conversationId");

ALTER TABLE "WebsiteAiInsight" ADD CONSTRAINT "WebsiteAiInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAiInsight" ADD CONSTRAINT "WebsiteAiInsight_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAiConversation" ADD CONSTRAINT "WebsiteAiConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAiConversation" ADD CONSTRAINT "WebsiteAiConversation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAiMessage" ADD CONSTRAINT "WebsiteAiMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAiMessage" ADD CONSTRAINT "WebsiteAiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WebsiteAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
