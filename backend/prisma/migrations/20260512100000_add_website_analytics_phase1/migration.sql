-- CreateTable
CREATE TABLE "WebsiteAnalyticsSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "trackingKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "privacySettings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAnalyticsSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteVisitor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "WebsiteVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "entryUrl" TEXT NOT NULL,
    "exitUrl" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "hasJsError" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "WebsiteSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT,
    "title" TEXT,
    "x" INTEGER,
    "y" INTEGER,
    "scrollY" INTEGER,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAnalyticsSite_trackingKey_key" ON "WebsiteAnalyticsSite"("trackingKey");
CREATE INDEX "WebsiteAnalyticsSite_tenantId_idx" ON "WebsiteAnalyticsSite"("tenantId");
CREATE INDEX "WebsiteAnalyticsSite_domain_idx" ON "WebsiteAnalyticsSite"("domain");
CREATE INDEX "WebsiteAnalyticsSite_trackingKey_idx" ON "WebsiteAnalyticsSite"("trackingKey");
CREATE INDEX "WebsiteAnalyticsSite_tenantId_domain_idx" ON "WebsiteAnalyticsSite"("tenantId", "domain");

CREATE UNIQUE INDEX "WebsiteVisitor_siteId_anonymousId_key" ON "WebsiteVisitor"("siteId", "anonymousId");
CREATE INDEX "WebsiteVisitor_tenantId_idx" ON "WebsiteVisitor"("tenantId");
CREATE INDEX "WebsiteVisitor_siteId_idx" ON "WebsiteVisitor"("siteId");
CREATE INDEX "WebsiteVisitor_anonymousId_idx" ON "WebsiteVisitor"("anonymousId");
CREATE INDEX "WebsiteVisitor_tenantId_siteId_idx" ON "WebsiteVisitor"("tenantId", "siteId");
CREATE INDEX "WebsiteVisitor_tenantId_siteId_lastSeenAt_idx" ON "WebsiteVisitor"("tenantId", "siteId", "lastSeenAt");

CREATE UNIQUE INDEX "WebsiteSession_sessionKey_key" ON "WebsiteSession"("sessionKey");
CREATE INDEX "WebsiteSession_tenantId_idx" ON "WebsiteSession"("tenantId");
CREATE INDEX "WebsiteSession_siteId_idx" ON "WebsiteSession"("siteId");
CREATE INDEX "WebsiteSession_visitorId_idx" ON "WebsiteSession"("visitorId");
CREATE INDEX "WebsiteSession_sessionKey_idx" ON "WebsiteSession"("sessionKey");
CREATE INDEX "WebsiteSession_startedAt_idx" ON "WebsiteSession"("startedAt");
CREATE INDEX "WebsiteSession_tenantId_siteId_idx" ON "WebsiteSession"("tenantId", "siteId");
CREATE INDEX "WebsiteSession_tenantId_siteId_startedAt_idx" ON "WebsiteSession"("tenantId", "siteId", "startedAt");

CREATE INDEX "WebsiteEvent_tenantId_idx" ON "WebsiteEvent"("tenantId");
CREATE INDEX "WebsiteEvent_siteId_idx" ON "WebsiteEvent"("siteId");
CREATE INDEX "WebsiteEvent_sessionId_idx" ON "WebsiteEvent"("sessionId");
CREATE INDEX "WebsiteEvent_visitorId_idx" ON "WebsiteEvent"("visitorId");
CREATE INDEX "WebsiteEvent_type_idx" ON "WebsiteEvent"("type");
CREATE INDEX "WebsiteEvent_createdAt_idx" ON "WebsiteEvent"("createdAt");
CREATE INDEX "WebsiteEvent_tenantId_siteId_createdAt_idx" ON "WebsiteEvent"("tenantId", "siteId", "createdAt");
CREATE INDEX "WebsiteEvent_tenantId_siteId_type_idx" ON "WebsiteEvent"("tenantId", "siteId", "type");

-- AddForeignKey
ALTER TABLE "WebsiteAnalyticsSite" ADD CONSTRAINT "WebsiteAnalyticsSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteVisitor" ADD CONSTRAINT "WebsiteVisitor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteVisitor" ADD CONSTRAINT "WebsiteVisitor_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSession" ADD CONSTRAINT "WebsiteSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSession" ADD CONSTRAINT "WebsiteSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteSession" ADD CONSTRAINT "WebsiteSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
