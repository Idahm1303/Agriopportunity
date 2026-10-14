# AgriOpportunity API

This document summarizes the REST API for the MVP. All routes are versioned under /api/v1.

## Authentication

- Credentials-based auth via NextAuth.js at /api/auth/[...nextauth]
- Session cookies are used for secure application and status update flows.

## Routes

### GET /api/v1/opportunities

Returns a list of all visible opportunities.

Response:

```json
{
  "opportunities": [
    {
      "id": "opp-1",
      "title": "Farm Production Learnership",
      "description": "...",
      "category": "learnership",
      "location": "Pretoria",
      "requiredSkills": ["Crop science", "Irrigation"],
      "postedById": "user-employer-1",
      "status": "open",
      "createdAt": "2026-09-03T00:00:00.000Z"
    }
  ]
}
```

### POST /api/v1/opportunities

Creates a new opportunity. Employer/admin only.

Request body:

```json
{
  "title": "Agri Data Intern",
  "description": "Support field data capture and reporting.",
  "category": "job",
  "applicationEmail": "careers@example.com",
  "location": "Cape Town",
  "requiredSkills": ["Data capture", "Reporting"]
}
```

### GET /api/opportunities/{jobs|learnerships|bursaries|funding}

Returns available opportunities in one category, ranked by the signed-in learner's skill and location match. Each result includes `matchScore`. These category-specific endpoints can also be called independently of the Marketplace UI.

### GET /api/v1/opportunities/[id]

Fetches the details of a single opportunity.

### POST /api/v1/applications

Learners submit an application as `multipart/form-data` with `opportunityId`, a 10-2,000 character `coverNote`, a CV file (`cv`, PDF/DOC/DOCX up to 10 MB), and an optional `qualificationDocument` (PDF/JPG/PNG up to 10 MB). The application is saved before email delivery is attempted. The system emails the CV and application details to the opportunity's `applicationEmail`, and sends a confirmation to the learner. If delivery fails, the saved application response includes `emailDelivery.complete: false` and can be retried from `POST /api/v1/applications/[id]/retry-email`.

Applications are rejected if the applicant has already applied or the opportunity is closed/expired. Learners, farmers, SMMEs and co-operatives use the same application and tracking pipeline. A failed email does not remove the application.

### GET /api/v1/applications

Returns the currently logged in learner's applications, including status history and email-delivery state.

### PATCH /api/v1/applications/[id]

Employer/provider/admin updates application status. Values include `submitted`, `under_review`, `shortlisted`, `interview`, `accepted`, and `rejected`; the legacy `successful` and `unsuccessful` values remain supported. Each change is added to application status history and an email notification is attempted. If email delivery is unavailable or fails, the response includes an `emailWarning`.

Request body:

```json
{
  "status": "under_review"
}
```

### POST /api/v1/register

Creates a new learner or employer account.

Request body:

```json
{
  "email": "user@example.com",
  "password": "P@ssword123",
  "fullName": "Jane Doe",
  "role": "LEARNER",
  "location": "Pretoria"
}
```

Employer registration also requires `organizationName` and `phoneNumber`; new clients should send `province` and may send `townDistrict`. Legacy clients may continue sending `location`. Farmer, SMME and co-operative registration require `province`. All roles can select a preferred language. Registration returns the shared `user.id` identifier.

### POST /api/v1/reports

An authenticated applicant reports a suspicious or fraudulent opportunity.

```json
{ "opportunityId": "opp-1", "reason": "The listing asks applicants to pay an application fee." }
```

### POST /api/v1/saved-opportunities

An authenticated applicant saves an opportunity for later.

```json
{ "opportunityId": "opp-1" }
```

### DELETE /api/v1/saved-opportunities

Removes an applicant's saved opportunity. The request body uses the same shape as the POST request.

### PATCH /api/v1/admin/opportunities/[id]

Administrator moderation changes a listing to `open`, `closed`, or `suspended`.

### PATCH /api/v1/admin/employers/[id]

Administrator verification changes an employer to `pending`, `verified`, or `rejected` and may include `verificationDocumentUrl`.

### OCR document response fields

Profile and application OCR workflows store document metadata and return `extractionConfidence`. Clients should ask the applicant to confirm extracted values when `extractionConfidence` is below `0.8`.

## Farmer, SMME and integration endpoints

The OpenAPI 3.1 contract is maintained in [`openapi.yaml`](./openapi.yaml).

- `PUT /api/v1/profiles/farmer` stores the farmer's farm type, commodities, stage, tenure and support needs.
- `PUT /api/v1/profiles/smme` stores SMME/co-operative details and turnover band only (not exact turnover).
- `POST /api/v1/smme-diagnostics` accepts eight integer answers from 0 to 3, calculates and stores the score server-side, and returns ranked gaps.
- `GET /api/v1/matches` returns ranked opportunities with `matchScore` and a plain-language `matchReason`.
- `POST /api/v1/recommendations/support-programmes` accepts supported diagnostic gap keys/labels. A signed-in SMME/co-operative may request matches for their own shared user ID. AgriSMME service-to-service access may use a configured `AGRISMME_API_TOKEN` bearer token and the target SMME `userId`.
- `POST /api/v1/profile/roles` adds a role grant to the signed-in identity. The header can then switch the active role; it does not create another account.
- `PATCH /api/v1/profile/roles` persists the active role for future sign-ins. The requested role must already be granted.
- `GET/POST /api/v1/profile-documents` supports farmer/SMME ID, registration, funding and certificate files. Files are uploaded with server-side AES-256 encryption. OCR data is stored as unconfirmed, ID numbers are masked in responses, and the applicant must explicitly confirm review. OCR never submits an application.
- `GET /api/v1/opportunities?type=...&audience=...&province=...` filters visible listings. National opportunities are included when a province is selected.

Opportunity types are `job`, `learnership`, `bursary`, `funding`, `internship`, `graduate_placement`, `skills_programme`, `artisan`, `mentorship`, `research`, `smme_programme`, and `funding_call`. The original `category` field remains available for compatibility with existing clients.
