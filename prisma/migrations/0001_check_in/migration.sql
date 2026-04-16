-- Add check-in tracking to Invitee
ALTER TABLE "Invitee" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Invitee" ADD COLUMN "checkedInCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Invitee_eventId_checkedInAt_idx" ON "Invitee"("eventId", "checkedInAt");
