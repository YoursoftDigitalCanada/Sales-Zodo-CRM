-- CreateTable
CREATE TABLE "WebsiteRecording" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECORDING',
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "labels" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "shareToken" TEXT,
    "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteRecordingChunk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "eventCount" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteRecordingChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteRecording_shareToken_key" ON "WebsiteRecording"("shareToken");
CREATE INDEX "WebsiteRecording_tenantId_idx" ON "WebsiteRecording"("tenantId");
CREATE INDEX "WebsiteRecording_siteId_idx" ON "WebsiteRecording"("siteId");
CREATE INDEX "WebsiteRecording_sessionId_idx" ON "WebsiteRecording"("sessionId");
CREATE INDEX "WebsiteRecording_visitorId_idx" ON "WebsiteRecording"("visitorId");
CREATE INDEX "WebsiteRecording_tenantId_siteId_createdAt_idx" ON "WebsiteRecording"("tenantId", "siteId", "createdAt");
CREATE INDEX "WebsiteRecording_tenantId_sessionId_idx" ON "WebsiteRecording"("tenantId", "sessionId");

CREATE UNIQUE INDEX "WebsiteRecordingChunk_recordingId_sequence_key" ON "WebsiteRecordingChunk"("recordingId", "sequence");
CREATE INDEX "WebsiteRecordingChunk_tenantId_idx" ON "WebsiteRecordingChunk"("tenantId");
CREATE INDEX "WebsiteRecordingChunk_recordingId_idx" ON "WebsiteRecordingChunk"("recordingId");
CREATE INDEX "WebsiteRecordingChunk_sessionId_idx" ON "WebsiteRecordingChunk"("sessionId");
CREATE INDEX "WebsiteRecordingChunk_tenantId_recordingId_idx" ON "WebsiteRecordingChunk"("tenantId", "recordingId");

-- AddForeignKey
ALTER TABLE "WebsiteRecording" ADD CONSTRAINT "WebsiteRecording_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteRecording" ADD CONSTRAINT "WebsiteRecording_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteRecording" ADD CONSTRAINT "WebsiteRecording_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteRecording" ADD CONSTRAINT "WebsiteRecording_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebsiteRecordingChunk" ADD CONSTRAINT "WebsiteRecordingChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteRecordingChunk" ADD CONSTRAINT "WebsiteRecordingChunk_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "WebsiteRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteRecordingChunk" ADD CONSTRAINT "WebsiteRecordingChunk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
