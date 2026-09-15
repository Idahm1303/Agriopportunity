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
  "location": "Cape Town",
  "requiredSkills": ["Data capture", "Reporting"]
}
```

### GET /api/v1/opportunities/[id]

Fetches the details of a single opportunity.

### POST /api/v1/applications

Learners can submit an application to a specific opportunity.

Request body:

```json
{
  "opportunityId": "opp-1"
}
```

### GET /api/v1/applications

Returns the currently logged in learner's applications.

### PATCH /api/v1/applications/[id]

Employer/admin updates application status.

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
