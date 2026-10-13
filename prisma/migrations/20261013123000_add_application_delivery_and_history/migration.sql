ALTER TABLE "Application"
ADD COLUMN "coverNote" TEXT,
ADD COLUMN "cvUrl" TEXT,
ADD COLUMN "employerEmailSentAt" TIMESTAMP(3),
ADD COLUMN "learnerEmailSentAt" TIMESTAMP(3),
ADD COLUMN "emailError" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Application" SET "updatedAt" = "createdAt";

CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ApplicationStatusHistory" ("id", "applicationId", "status", "changedAt")
SELECT gen_random_uuid()::text, "id", "status", "createdAt" FROM "Application";

UPDATE "Application" SET "status" = CASE
  WHEN "status" IN ('accepted', 'placed') THEN 'successful'
  WHEN "status" = 'rejected' THEN 'unsuccessful'
  ELSE "status"
END;

UPDATE "ApplicationStatusHistory" SET "status" = CASE
  WHEN "status" IN ('accepted', 'placed') THEN 'successful'
  WHEN "status" = 'rejected' THEN 'unsuccessful'
  ELSE "status"
END;

ALTER TABLE "ApplicationStatusHistory"
ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;