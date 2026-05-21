CREATE TABLE "DocumentCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentMetadata" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "categoryId" TEXT,
  "documentType" TEXT,
  "description" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "linkedEntityType" TEXT,
  "linkedEntityId" TEXT,
  "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
  "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentMetadata_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentCategory_tenantId_idx" ON "DocumentCategory"("tenantId");
CREATE UNIQUE INDEX "DocumentCategory_tenantId_name_key" ON "DocumentCategory"("tenantId", "name");
CREATE INDEX "DocumentMetadata_tenantId_idx" ON "DocumentMetadata"("tenantId");
CREATE INDEX "DocumentMetadata_fileId_idx" ON "DocumentMetadata"("fileId");
CREATE UNIQUE INDEX "DocumentMetadata_fileId_key" ON "DocumentMetadata"("fileId");
CREATE INDEX "DocumentMetadata_categoryId_idx" ON "DocumentMetadata"("categoryId");
CREATE INDEX "DocumentMetadata_linkedEntityType_linkedEntityId_idx" ON "DocumentMetadata"("linkedEntityType", "linkedEntityId");

ALTER TABLE "DocumentCategory" ADD CONSTRAINT "DocumentCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentMetadata" ADD CONSTRAINT "DocumentMetadata_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentMetadata" ADD CONSTRAINT "DocumentMetadata_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentMetadata" ADD CONSTRAINT "DocumentMetadata_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
