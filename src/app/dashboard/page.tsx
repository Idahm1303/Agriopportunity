import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { findUserById, getUserApplications } from "@/lib/database";
import { ApplicationEmailRetry } from "@/components/ApplicationEmailRetry";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const learner = userId ? await findUserById(userId) : undefined;
  const applications = userId ? await getUserApplications(userId) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Dashboard</p>
          <h1 className="mt-3 font-display text-4xl text-forest">Welcome back, {learner?.fullName ?? "Learner"}</h1>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/opportunities?matched=true" className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-cream hover:bg-leaf">
            Browse matched opportunities
          </Link>
          <Link href="/opportunities" className="rounded-full border border-forest/20 px-5 py-3 text-sm font-medium text-forest hover:bg-cream2">
            Browse all opportunities
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
          <h2 className="font-display text-2xl text-forest">Your profile</h2>
          <dl className="mt-5 space-y-4 text-sm text-inkSoft">
            <div>
              <dt className="font-medium text-ink">Email</dt>
              <dd>{learner?.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Location</dt>
              <dd>{learner?.location ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Skills</dt>
              <dd>{learner?.skills.join(", ") ?? "No skills added"}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Qualifications</dt>
              <dd>{learner?.qualifications.join(", ") ?? "No qualifications added"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
          <h2 className="font-display text-2xl text-forest">My applications</h2>
          <div className="mt-5 space-y-4">
            {applications.length ? (
              applications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-forest/10 bg-cream p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf">{application.status}</p>
                      <h3 className="mt-1 text-xl font-semibold text-ink">{application.opportunityTitle ?? `Opportunity #${application.opportunityId}`}</h3>
                    </div>
                    <span className="inline-flex rounded-full bg-goldSoft px-2.5 py-1 text-xs font-semibold text-ink">
                      {application.matchScore ?? 0}% match
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-inkSoft">Applied {new Date(application.createdAt).toLocaleDateString()} · Updated {new Date(application.updatedAt ?? application.createdAt).toLocaleDateString()}</p>
                  {application.statusHistory?.length ? (
                    <ol className="mt-4 space-y-2 border-l-2 border-forest/15 pl-4" aria-label="Application status timeline">
                      {application.statusHistory.map((entry, index) => (
                        <li key={`${application.id}-${entry.changedAt}-${index}`} className="text-sm text-inkSoft">
                          <span className="font-medium text-ink">{entry.status.replaceAll("_", " ")}</span>
                          <span className="ml-2 text-xs">{new Date(entry.changedAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {application.emailError ? <p className="mt-3 text-sm text-red-700">Email delivery needs attention: {application.emailError}</p> : null}
                  <ApplicationEmailRetry applicationId={application.id} pending={Boolean(application.cvUrl) && (!application.employerEmailSentAt || !application.learnerEmailSentAt)} />
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-cream p-4 text-inkSoft">You have not submitted any applications yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
