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
- applications: linked applications submitted by this user
- opportunities: opportunities posted by this user when they are an employer/admin

### Opportunity

The Opportunity model represents jobs, learnerships, bursaries, or funding calls.

- title: clear public title
- description: detailed overview
- category: one of the four supported opportunity types
- location: where the opportunity sits
- requiredSkills: simple match tags used for skill-overlap score
- postedBy: who published the listing
- status: open or similar lifecycle state

### Application

The Application model links a learner to an opportunity and stores progression through the review process.

- user: learner who applied
- opportunity: target listing
- status: submitted, under_review, accepted, rejected
- matchScore: percentage based on required skill overlap
- createdAt: timestamp of submission

### AuditLog

The AuditLog table records key actions such as application submission or status changes to support traceability and future reporting.
