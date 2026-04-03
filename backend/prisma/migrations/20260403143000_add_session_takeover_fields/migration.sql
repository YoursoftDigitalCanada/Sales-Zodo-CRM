ALTER TABLE "RefreshToken"
ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "revokedReason" TEXT,
ADD COLUMN "forceLogoutAt" TIMESTAMP(3),
ADD COLUMN "warningIssuedAt" TIMESTAMP(3);

CREATE INDEX "RefreshToken_userId_revokedAt_expiresAt_idx"
ON "RefreshToken"("userId", "revokedAt", "expiresAt");

CREATE INDEX "RefreshToken_userId_forceLogoutAt_idx"
ON "RefreshToken"("userId", "forceLogoutAt");
