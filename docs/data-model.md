# AgriOpportunity Data Model

The MVP uses Prisma with a PostgreSQL database. The design is intentionally simple for a fast WIL-ready prototype and can evolve later into a fuller AgriConnect 360 ecosystem.

## Core entities

### User

The User model stores the account and profile information for each participant.

- email: unique login identifier
- passwordHash: bcrypt-hashed password
- role: one of LEARNER, EMPLOYER, or ADMIN
- fullName: display name
- location: optional user area
- skills: string array for profile tags
- qualifications: string array for education or credentials
- verificationStatus: pending, verified, or rejected employer review state
- verificationDocumentUrl: optional company registration or accreditation evidence
- applications: linked applications submitted by this user
- opportunities: opportunities posted by this user when they are an employer/admin
- documents, reports, and saved opportunities: related evidence and applicant actions

### Opportunity

The Opportunity model represents jobs, learnerships, bursaries, or funding calls.

- title: clear public title
- description: detailed overview
- category: one of the four supported opportunity types
- location: where the opportunity sits
- requiredSkills: simple match tags used for skill-overlap score
- postedBy: who published the listing
- status: open or similar lifecycle state
- paymentRequestFlag: moderation flag for payment-request language or reports
- viewCount: basic engagement metric for oversight reporting

### Application

The Application model links a learner to an opportunity and stores progression through the review process.

- user: learner who applied
- opportunity: target listing
- status: submitted, under_review, accepted, rejected
- matchScore: percentage based on required skill overlap
- qualificationDocumentName: uploaded PDF, JPG, or PNG filename
- extractedText: text returned by AI document extraction
- extractedQualifications: credentials identified in the document
- extractedSkills: skills identified in the document
- matchedSkills: required skills matched against extracted skills
- createdAt: timestamp of submission
- documents: OCR document metadata linked to this application

### Document

Document stores metadata and extracted OCR values without assuming a particular production file-storage provider.

- documentType: qualification, identity, or proof-of-funding
- fileName: original uploaded filename
- storageUrl: nullable production storage reference
- extractedText, extractedQualifications, extractedSkills: OCR result
- confidence: value from 0 to 1; low-confidence results require applicant confirmation
- confirmedAt: timestamp when the applicant confirms extracted values

### Report

Report records a suspicious-listing complaint for administrator review.

- opportunity: reported listing
- reporterUserId: applicant who submitted the report
- reason: report explanation
- status: open, resolved, or dismissed
- resolutionNote and resolvedAt: administrator decision record

### SavedOpportunity

SavedOpportunity is the applicant-to-opportunity shortlist join table.

- applicantId and opportunityId: composite primary key
- savedAt: time the opportunity was saved

### AuditLog

The AuditLog table records key actions such as application submission or status changes to support traceability and future reporting.
