-- Alter support tickets for requester scoping and visible message counts
ALTER TABLE "SupportTicket"
ADD COLUMN "requesterUserId" TEXT,
ADD COLUMN "messagesCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "SupportTicket_requesterUserId_idx" ON "SupportTicket"("requesterUserId");

-- Allow internal staff notes without exposing them to CRM requesters
ALTER TABLE "TicketMessage"
ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- Backfill visible message counts from existing public messages
UPDATE "SupportTicket" t
SET "messagesCount" = subquery.visible_count
FROM (
  SELECT "ticketId", COUNT(*)::INTEGER AS visible_count
  FROM "TicketMessage"
  WHERE "isInternal" = false
  GROUP BY "ticketId"
) AS subquery
WHERE t."id" = subquery."ticketId";
