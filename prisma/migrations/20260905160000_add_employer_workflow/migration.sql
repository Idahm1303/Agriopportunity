-- AlterTable
ALTER TABLE "User" ADD COLUMN "organizationName" TEXT;

-- AlterTable
ALTER TABLE "Opportunity"
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Application"
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verifiedBy" TEXT,
ADD COLUMN "placedAt" TIMESTAMP(3),
ADD COLUMN "placedBy" TEXT;
