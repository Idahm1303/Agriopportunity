ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FARMER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SMME';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COOPERATIVE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PROVIDER';

CREATE TYPE "OpportunityType" AS ENUM (
    'job',
    'learnership',
    'bursary',
    'funding',
    'internship',
    'graduate_placement',
    'skills_programme',
    'artisan',
    'mentorship',
    'research',
    'smme_programme',
    'funding_call'
);

ALTER TABLE "User"
    ADD COLUMN "province" TEXT,
    ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'English';

ALTER TABLE "Document"
    ADD COLUMN "extractedData" JSONB,
    ADD COLUMN "extractionStatus" TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE "Document" ALTER COLUMN "extractionStatus" SET DEFAULT 'pending_confirmation';

CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "role")
);

INSERT INTO "user_roles" ("userId", "role")
SELECT "id", "role" FROM "User";

CREATE TABLE "farmer_profiles" (
    "userId" TEXT NOT NULL,
    "farmName" TEXT,
    "province" TEXT NOT NULL,
    "district" TEXT,
    "farmSizeHectares" DOUBLE PRECISION,
    "farmingType" TEXT,
    "mainCommodities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "yearsFarming" INTEGER,
    "farmerStage" TEXT,
    "landTenure" TEXT,
    "hasRegisteredBusiness" BOOLEAN NOT NULL DEFAULT false,
    "needs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "farmer_profiles_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "smme_profiles" (
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "entityType" TEXT,
    "registrationNumber" TEXT,
    "cipcRegistered" BOOLEAN NOT NULL DEFAULT false,
    "sectorFocus" TEXT,
    "employeesCount" INTEGER,
    "yearsTrading" INTEGER,
    "annualTurnoverBand" TEXT,
    "province" TEXT NOT NULL,
    "fundingStage" TEXT,
    "needs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "smme_profiles_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "smme_diagnostics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "gaps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "smme_diagnostics_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Opportunity"
    ADD COLUMN "type" "OpportunityType" NOT NULL DEFAULT 'job',
    ADD COLUMN "targetAudience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "province" TEXT,
    ADD COLUMN "closingDate" TIMESTAMP(3),
    ADD COLUMN "fundingAmountRange" TEXT,
    ADD COLUMN "eligibilityCriteria" JSONB,
    ADD COLUMN "applyUrl" TEXT;

UPDATE "Opportunity"
SET "type" = CASE
    WHEN lower("category") IN ('job', 'jobs') THEN 'job'::"OpportunityType"
    WHEN lower("category") IN ('learnership', 'learnerships') THEN 'learnership'::"OpportunityType"
    WHEN lower("category") IN ('bursary', 'bursaries') THEN 'bursary'::"OpportunityType"
    WHEN lower("category") = 'funding_call' THEN 'funding_call'::"OpportunityType"
    WHEN lower("category") = 'funding' THEN 'funding'::"OpportunityType"
    WHEN lower("category") IN ('internship', 'graduate_placement', 'skills_programme', 'artisan', 'mentorship', 'research', 'smme_programme') THEN lower("category")::"OpportunityType"
    ELSE 'job'::"OpportunityType"
END;

CREATE TABLE "opportunity_recommendations" (
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_recommendations_pkey" PRIMARY KEY ("userId", "opportunityId")
);

CREATE INDEX "smme_diagnostics_userId_createdAt_idx" ON "smme_diagnostics"("userId", "createdAt");
CREATE INDEX "opportunity_recommendations_userId_matchScore_idx" ON "opportunity_recommendations"("userId", "matchScore");

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "smme_profiles" ADD CONSTRAINT "smme_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "smme_diagnostics" ADD CONSTRAINT "smme_diagnostics_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunity_recommendations" ADD CONSTRAINT "opportunity_recommendations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunity_recommendations" ADD CONSTRAINT "opportunity_recommendations_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
