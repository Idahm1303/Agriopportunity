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
   cp .env.example .env.local
   ```
3. Update the values for your local database and secrets.
4. Run the app:
   ```bash
   npm run dev
   ```
5. Visit http://localhost:3000

## Environment variables

Create a .env.local file with:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Demo accounts

The MVP includes seeded demo data for quick testing:

- Learner: learner@agriopportunity.co.za / Password123!
- Employer: employer@agriopportunity.co.za / Password123!

## Available routes

- /
- /register
- /login
- /opportunities
- /opportunities/[id]
- /dashboard
- /employer/dashboard

## Deployment notes

1. Push the repository to GitHub.
2. Create a Neon Postgres database and copy the connection string.
3. Import the repo in Vercel and set DATABASE_URL and NEXTAUTH_SECRET.
4. Add a build step to run Prisma migrations before deployment.
5. Smoke-test registration, sign in, browse opportunities, apply, and view the dashboard.

## Documentation

- docs/api.md
- docs/data-model.md
