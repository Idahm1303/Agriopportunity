# AgriOpportunity Data Model

The MVP uses Prisma with a PostgreSQL database. The design is intentionally simple for a fast WIL-ready prototype and can evolve later into a fuller AgriConnect 360 ecosystem.

## Core entities

### User

The User model stores the account and profile information for each participant.

- email: unique login identifier
- passwordHash: bcrypt-hashed password
- role: current active/legacy role
- roles: grants in `user_roles`, allowing multiple roles for one account and shared user ID
- province and preferredLanguage: regional and language preferences
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

The Opportunity model represents the marketplace's employment, training, mentorship, research, SMME support and funding listings.

- title: clear public title
- description: detailed overview
- category: legacy string retained for client compatibility
- type: typed opportunity value, including jobs, learnerships, internships, graduate placements, skills programmes, artisan opportunities, mentorship, research, SMME programmes, bursaries and funding calls
- targetAudience, province, closingDate, fundingAmountRange, eligibilityCriteria, applyUrl: audience and application information for discovery and matching
- applicationEmail: employer/provider address for receiving applications
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
- status: submitted, under_review, shortlisted, interview, successful, unsuccessful
- matchScore: percentage based on required skill overlap
- coverNote: learner's message to the employer
- cvUrl: CV object-storage key emailed to the employer as an attachment
- employerEmailSentAt, learnerEmailSentAt, emailError: delivery state used for retry and learner feedback
- qualificationDocumentName: optional uploaded PDF, JPG, or PNG filename
- extractedText: text returned by AI document extraction
- extractedQualifications: credentials identified in the document
- extractedSkills: skills identified in the document
- matchedSkills: required skills matched against extracted skills
- createdAt and updatedAt: submission and most recent update timestamps
- documents: OCR document metadata linked to this application
- applicationData: optional JSON details for specialist applications such as an employer grant submission
- statusHistory: dated status transitions, including initial submission

### ApplicationStatusHistory

ApplicationStatusHistory records each application state transition, who made it, and when it occurred. It is displayed as the learner's application timeline.

### Document

Document stores metadata and extracted OCR values without assuming a particular production file-storage provider.

- documentType: qualification, identity, or proof-of-funding
- fileName: original uploaded filename
- storageUrl: nullable production storage reference
- extractedText, extractedQualifications, extractedSkills: OCR result
- confidence: value from 0 to 1; low-confidence results require applicant confirmation
- confirmedAt: timestamp when the applicant confirms extracted values
- extractedData and extractionStatus: structured OCR suggestions and explicit pending/confirmed review state for farmer/SMME uploads

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

### OpportunityNotification

`opportunity_notifications` stores new matching farmer, SMME and co-operative opportunity alerts.

- userId and opportunityId: the account and opened listing
- matchReason: plain-language explanation based on the profile
- readAt and emailSentAt: in-app review and email delivery timestamps
- A unique user/opportunity key prevents duplicate alerts for the same opening.

### AuditLog

The AuditLog table records key actions such as application submission or status changes to support traceability and future reporting.

## Farmer, SMME and recommendations

- `farmer_profiles` stores farm name, province/district, area, farming type, commodities, years farming, stage, tenure, business registration and support needs.
- `smme_profiles` stores business/entity details, CIPC status, sector, staff count, years trading, turnover band, province, funding stage and support needs.
- `smme_diagnostics` stores each eight-question answer set, a server-calculated score from 0 to 100, and ranked growth gaps.
- `opportunity_recommendations` stores a per-user, per-opportunity match score and plain-language reason. Scores are refreshed when matches are requested.
- Matching farmer-targeted skills programmes, funding calls, funding opportunities, mentorship, bursaries and learnerships create alerts when first published or reopened. Farmer alerts use the account's preferred language.
- Matching SMME programmes and funding calls create in-app alerts and email notifications when first published or reopened.
