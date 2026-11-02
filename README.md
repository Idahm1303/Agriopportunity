# AgriOpportunity

AgriOpportunity is a standalone MVP opportunity marketplace for agricultural learners, job seekers, and SMMEs. It helps people discover jobs, learnerships, bursaries, and funding opportunities while making application tracking visible and simple.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- NextAuth.js credentials auth
- Prisma + PostgreSQL (Neon-ready)
- Vercel deployment

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Set `DATABASE_URL` to Neon's pooled connection and `DIRECT_URL` to its non-pooled connection for the same database. Update the remaining values for your local setup.
4. Apply the database migrations and seed demo records:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```
5. Run the app:
   ```bash
   npm run dev
   ```
6. Visit http://localhost:3000

## Environment variables

Create a .env.local file with:

```bash
DATABASE_URL="postgresql://...-pooler/..."
DIRECT_URL="postgresql://.../"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="qwen/qwen3.8-27b"
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"
AWS_S3_BUCKET="agriopportunity-documents"
AWS_ENDPOINT_URL_S3="https://your-neon-object-storage-endpoint"
AWS_REGION="aws-eu-central-1"
AWS_ACCESS_KEY_ID="your-neon-storage-access-key"
AWS_SECRET_ACCESS_KEY="your-neon-storage-secret-key"
```

Prisma CLI commands load `.env`; Next.js also supports `.env.local`. Keep both database URLs in `.env` so local Prisma migrations can read `DIRECT_URL`.

## Email setup

Set these server-side environment variables in `.env.local` for local development and in your hosting provider for deployments:

- `RESEND_API_KEY`: your Resend API key.
- `EMAIL_TEST_MODE`: set to `true` to route every email to `TEST_EMAIL_RECIPIENT`; any other value sends to the real recipient.
- `TEST_EMAIL_RECIPIENT`: the inbox that receives test messages (for example, `agriopportunity@gmail.com`).

In test mode, each message includes `[TEST - intended for <real applicant email>]` in its subject so it cannot be mistaken for a real applicant notification.
The sender is fixed to `AgriOpportunity <onboarding@resend.dev>` while using Resend's test sender.

To go live, verify a domain in Resend, update the sender in `src/lib/email.ts` to an address on that domain, set `EMAIL_TEST_MODE=false`, and delete `src/app/api/test-email/route.ts`.

## Demo accounts

The MVP includes seeded demo data for quick testing:

- Learner: learner@agriopportunity.co.za / Password123!
- Employer: employer@agriopportunity.co.za / Password123!

Applications require a qualification document upload. The server reads PDF, JPG, and PNG documents for text, qualification, and skill extraction, then scores the extracted skills against the opportunity requirements. Profile documents (ID, business registration, funding proof, and certificates) use the same extraction chain. Extraction tries Groq first (`GROQ_API_KEY`), then the OpenAI-compatible Responses API (`OPENAI_API_KEY`, with optional `OPENAI_BASE_URL` and `OPENAI_MODEL`), and falls back to local OCR with Tesseract when no key is set or every provider fails. All API keys are optional; local OCR is less accurate, so its results are flagged for the user to confirm. PDFs with selectable text are read directly and sent to Groq as text; scanned PDFs need a provider that accepts PDF inputs (OpenAI), or can be uploaded as a JPG or PNG photo instead. Documents are limited to 10 MB and the demo application store keeps extracted results in memory.

Every uploaded document is stored in the configured private Neon Object Storage bucket using its S3-compatible endpoint. Scanned documents are uploaded before OCR begins; if storage is unavailable, the scan and profile save are stopped rather than continuing without a stored original. Configure all five storage variables below for both local development and each deployment environment; `AWS_S3_BUCKET` is required and must match the provisioned bucket name.

The repository declares the private bucket as `agriopportunity-documents` in `neon.ts`. To configure it:

1. Link the Neon CLI to the Neon project and branch that should own document storage.
2. Run `neon deploy` from the repository root to provision the declared bucket.
3. Run `neon env pull` to retrieve the bucket's S3-compatible settings into `.env.local`. Confirm these variables are present: `AWS_S3_BUCKET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
4. Restart the development server. For deployments, add the same five values to the hosting provider's server-side environment settings and redeploy.
5. Test a document upload through the app and confirm the object appears in the private `agriopportunity-documents` bucket.

Never expose or commit the access key or secret key. Do not add an `NEXT_PUBLIC_` prefix to any storage variable.

## Available routes

- /
- /register
- /login
- /opportunities
- /opportunities/[id]
- /dashboard
- /employer/dashboard

## Deployment notes

1. Import the repo in Vercel and set `DATABASE_URL` to Neon's pooled PostgreSQL URL and `DIRECT_URL` to the direct (non-pooler) URL for the same database. Both must start with `postgresql://` or `postgres://`; do not include quotes in Vercel values.
2. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` for the production deployment.
3. Keep the Vercel build command as `npm run vercel-build`; it applies Prisma migrations using `DIRECT_URL`, then builds the app using `DATABASE_URL`.
4. Add the storage and email environment variables if uploads and email notifications are needed.
5. Smoke-test registration, sign in, browse opportunities, apply, and view the dashboard.

## Documentation

- docs/api.md
- docs/data-model.md
