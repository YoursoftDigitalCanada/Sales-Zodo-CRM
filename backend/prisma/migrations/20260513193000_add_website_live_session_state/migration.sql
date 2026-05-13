CREATE TABLE "WebsiteLiveSessionState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT,
    "currentUrl" TEXT,
    "currentPath" TEXT,
    "currentTitle" TEXT,
    "referrer" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "country" TEXT,
    "isRecording" BOOLEAN NOT NULL DEFAULT false,
    "lastEventType" TEXT,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "hasJsError" BOOLEAN NOT NULL DEFAULT false,
    "hasBehaviorSignal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteLiveSessionState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteLiveSessionState_sessionId_key" ON "WebsiteLiveSessionState"("sessionId");
CREATE INDEX "WebsiteLiveSessionState_tenantId_idx" ON "WebsiteLiveSessionState"("tenantId");
CREATE INDEX "WebsiteLiveSessionState_siteId_idx" ON "WebsiteLiveSessionState"("siteId");
CREATE INDEX "WebsiteLiveSessionState_visitorId_idx" ON "WebsiteLiveSessionState"("visitorId");
CREATE INDEX "WebsiteLiveSessionState_lastEventAt_idx" ON "WebsiteLiveSessionState"("lastEventAt");
CREATE INDEX "WebsiteLiveSessionState_tenantId_siteId_lastEventAt_idx" ON "WebsiteLiveSessionState"("tenantId", "siteId", "lastEventAt");

ALTER TABLE "WebsiteLiveSessionState" ADD CONSTRAINT "WebsiteLiveSessionState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteLiveSessionState" ADD CONSTRAINT "WebsiteLiveSessionState_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteLiveSessionState" ADD CONSTRAINT "WebsiteLiveSessionState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteLiveSessionState" ADD CONSTRAINT "WebsiteLiveSessionState_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
