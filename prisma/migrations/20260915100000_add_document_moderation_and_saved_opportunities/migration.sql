ALTER TABLE "User"
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "verificationDocumentUrl" TEXT;

ALTER TABLE "Opportunity"
ADD COLUMN "paymentRequestFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "applicationId" TEXT,
  "documentType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storageUrl" TEXT,
  "extractedText" TEXT,
  "extractedQualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "extractedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "confidence" DOUBLE PRECISION,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedOpportunity" (
  "applicantId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedOpportunity_pkey" PRIMARY KEY ("applicantId", "opportunityId")
);

ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Report_status_idx" ON "Report"("status");