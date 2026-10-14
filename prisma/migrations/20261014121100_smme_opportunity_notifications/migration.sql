CREATE TABLE "opportunity_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "opportunity_notifications_userId_opportunityId_key"
    ON "opportunity_notifications"("userId", "opportunityId");
CREATE INDEX "opportunity_notifications_userId_createdAt_idx"
    ON "opportunity_notifications"("userId", "createdAt");

ALTER TABLE "opportunity_notifications" ADD CONSTRAINT "opportunity_notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunity_notifications" ADD CONSTRAINT "opportunity_notifications_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
