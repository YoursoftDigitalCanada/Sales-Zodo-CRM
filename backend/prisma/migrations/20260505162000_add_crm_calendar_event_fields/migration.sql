ALTER TABLE "CalendarEvent"
  ADD COLUMN IF NOT EXISTS "attending" TEXT DEFAULT 'Yes',
  ADD COLUMN IF NOT EXISTS "referenceDoctype" TEXT,
  ADD COLUMN IF NOT EXISTS "referenceDocname" TEXT;

CREATE INDEX IF NOT EXISTS "CalendarEvent_referenceDoctype_referenceDocname_idx"
  ON "CalendarEvent"("referenceDoctype", "referenceDocname");
