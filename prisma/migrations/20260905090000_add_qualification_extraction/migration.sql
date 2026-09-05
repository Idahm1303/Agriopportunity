ALTER TABLE "Application"
  ADD COLUMN "qualificationDocumentName" TEXT,
  ADD COLUMN "extractedText" TEXT,
  ADD COLUMN "extractedQualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "extractedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "matchedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
