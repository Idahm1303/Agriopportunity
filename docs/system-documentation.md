# AgriOpportunity System Documentation

## 1. Functional Requirements

- **FR-1:** A user shall be able to register and sign in as an applicant, employer, or administrator.
- **FR-2:** An applicant shall maintain a profile containing contact details, province/town, qualifications, and skills.
- **FR-3:** An applicant shall search and filter visible opportunities by keyword and category.
- **FR-4:** An applicant shall view opportunity details and a rules-based skills match score.
- **FR-5:** An applicant shall submit an application before an opportunity closes.
- **FR-6:** An employer shall create, publish, close, and review opportunities.
- **FR-7:** Employers and administrators shall review application status, qualification evidence, and match results.
- **FR-8:** An employer shall update an application through review, shortlist, rejection, or placement states.
- **FR-9:** The system shall record auditable actions for applications, listings, reports, moderation, and verification.
- **FR-10:** Role-based access control shall restrict applicant, employer, and administrator actions.
- **FR-11:** An applicant shall upload a qualification document in PDF, JPG, or PNG format.
- **FR-12:** The system shall run OCR on an uploaded document and extract text, qualifications, and skills.
- **FR-13:** Extracted OCR values shall be matched against the controlled skill and qualification vocabulary before being proposed for the profile.
- **FR-14:** The system shall store an OCR confidence score and require applicant confirmation for low-confidence values.
- **FR-15:** An applicant shall report an opportunity as suspicious or fraudulent.
- **FR-16:** The system shall identify payment-request risk and prevent flagged listings from remaining publicly open until review.
- **FR-17:** An administrator shall review reports, suspend or remove a listing, and suspend the associated employer account where necessary.
- **FR-18:** An administrator shall review employer verification evidence and approve, reject, or return an employer to pending status with an auditable reason.
- **FR-19:** An administrator shall view platform metrics including active listings, applications, verified employers, and opportunity views.
- **FR-20:** An administrator shall moderate any opportunity listing.
- **FR-21:** An applicant shall save or remove an opportunity from a personal shortlist.
- **FR-22:** A user shall be able to reset a forgotten password through a verified email link. This remains a planned production workflow because the MVP currently uses credentials authentication without an email delivery provider.

## 2. Non-functional requirements

- **Accuracy:** OCR shall expose confidence and shall not silently treat low-confidence extraction as confirmed profile data.
- **Security:** Passwords shall be hashed, protected routes shall require a session, and role checks shall be enforced server-side.
- **Performance:** Public opportunity browsing shall remain usable on low- and mid-range smartphones and low-bandwidth connections.
- **Accessibility:** Interfaces shall use semantic HTML, keyboard-accessible controls, visible focus states, labels, and basic WCAG 2.1 AA contrast practices where feasible within the WIL scope.
- **Privacy and retention:** Applicant identity and document data shall be collected with explicit consent. Production retention periods for `id_number` and uploaded documents must be approved with the POPIA data owner; the MVP flags this policy for production rather than silently defining a legal retention period.
- **Auditability:** Moderation, employer verification, application changes, and fraud reports shall be recorded with actor and timestamp.
- **Scope discipline:** Payments, WSP-ATR workflows, Connect ME/CRM synchronization, and SMS/WhatsApp notifications remain outside the MVP.

## 3. Scope decisions and future work

- Province, education level, and sector are currently represented by profile/listing strings for the MVP. They should become controlled lookup tables or enums before production matching depends on exact comparisons.
- Applicant-employer messaging after shortlisting is intentionally out of scope to avoid duplicating a full recruitment workflow; a future release may add it.
- Multilingual content and USSD/WhatsApp access are future work. The Limpopo low-bandwidth scenario should be revisited when those channels are designed.
- `Opportunity.viewCount` supports basic engagement reporting without introducing a payment or recruitment workflow.
