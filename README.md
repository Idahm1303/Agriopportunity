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

## Demo accounts

The MVP includes seeded demo data for quick testing:

- Learner: learner@agriopportunity.co.za / Password123!
- Employer: employer@agriopportunity.co.za / Password123!

Applications require a qualification document upload. The server sends PDF, JPG, and PNG documents to the configured OpenAI-compatible Responses API for text, qualification, and skill extraction, then scores the extracted skills against the opportunity requirements. Set `OPENAI_BASE_URL` and `OPENAI_MODEL` to use a compatible provider such as Groq. Groq's Responses API supports text and image inputs; PDF `input_file` support is not documented, so PDF extraction may require a provider that accepts PDF inputs. Documents are limited to 10 MB and the demo application store keeps extracted results in memory.

Uploaded documents are stored in the configured private Neon Object Storage bucket using its S3-compatible endpoint. Provision the bucket and credentials with Neon Object Storage, then add the `AWS_S3_BUCKET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` variables to `.env.local` before testing uploads.

The repository declares the private bucket in `neon.ts`. After linking this project to the target Neon project and branch, run `neon deploy` to provision the bucket, then `neon env pull` to retrieve its S3-compatible environment variables into `.env.local`. Restart the development server after updating environment variables. Do not commit those credentials.

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
