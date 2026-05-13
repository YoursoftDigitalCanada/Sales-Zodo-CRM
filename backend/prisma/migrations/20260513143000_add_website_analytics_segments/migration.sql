-- CreateTable
CREATE TABLE "WebsiteAnalyticsSegment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteAnalyticsSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSessionTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteSessionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteVisitorIdentity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "externalUserId" TEXT,
    "emailHash" TEXT,
    "traits" JSONB NOT NULL DEFAULT '{}',
    "firstIdentifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIdentifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteVisitorIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteAnalyticsSegment_tenantId_idx" ON "WebsiteAnalyticsSegment"("tenantId");
CREATE INDEX "WebsiteAnalyticsSegment_siteId_idx" ON "WebsiteAnalyticsSegment"("siteId");
CREATE INDEX "WebsiteAnalyticsSegment_tenantId_siteId_idx" ON "WebsiteAnalyticsSegment"("tenantId", "siteId");

CREATE INDEX "WebsiteSessionTag_tenantId_idx" ON "WebsiteSessionTag"("tenantId");
CREATE INDEX "WebsiteSessionTag_siteId_idx" ON "WebsiteSessionTag"("siteId");
CREATE INDEX "WebsiteSessionTag_sessionId_idx" ON "WebsiteSessionTag"("sessionId");
CREATE INDEX "WebsiteSessionTag_visitorId_idx" ON "WebsiteSessionTag"("visitorId");
CREATE INDEX "WebsiteSessionTag_tenantId_siteId_idx" ON "WebsiteSessionTag"("tenantId", "siteId");
CREATE INDEX "WebsiteSessionTag_tenantId_siteId_name_idx" ON "WebsiteSessionTag"("tenantId", "siteId", "name");

CREATE UNIQUE INDEX "WebsiteVisitorIdentity_tenantId_siteId_visitorId_key" ON "WebsiteVisitorIdentity"("tenantId", "siteId", "visitorId");
CREATE UNIQUE INDEX "WebsiteVisitorIdentity_visitorId_key" ON "WebsiteVisitorIdentity"("visitorId");
CREATE INDEX "WebsiteVisitorIdentity_tenantId_idx" ON "WebsiteVisitorIdentity"("tenantId");
CREATE INDEX "WebsiteVisitorIdentity_siteId_idx" ON "WebsiteVisitorIdentity"("siteId");
CREATE INDEX "WebsiteVisitorIdentity_visitorId_idx" ON "WebsiteVisitorIdentity"("visitorId");
CREATE INDEX "WebsiteVisitorIdentity_externalUserId_idx" ON "WebsiteVisitorIdentity"("externalUserId");
CREATE INDEX "WebsiteVisitorIdentity_tenantId_siteId_idx" ON "WebsiteVisitorIdentity"("tenantId", "siteId");
CREATE INDEX "WebsiteVisitorIdentity_tenantId_siteId_externalUserId_idx" ON "WebsiteVisitorIdentity"("tenantId", "siteId", "externalUserId");

-- AddForeignKey
ALTER TABLE "WebsiteAnalyticsSegment" ADD CONSTRAINT "WebsiteAnalyticsSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteAnalyticsSegment" ADD CONSTRAINT "WebsiteAnalyticsSegment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSessionTag" ADD CONSTRAINT "WebsiteSessionTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSessionTag" ADD CONSTRAINT "WebsiteSessionTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSessionTag" ADD CONSTRAINT "WebsiteSessionTag_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSessionTag" ADD CONSTRAINT "WebsiteSessionTag_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebsiteVisitorIdentity" ADD CONSTRAINT "WebsiteVisitorIdentity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteVisitorIdentity" ADD CONSTRAINT "WebsiteVisitorIdentity_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteVisitorIdentity" ADD CONSTRAINT "WebsiteVisitorIdentity_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
