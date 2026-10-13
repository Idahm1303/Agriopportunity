import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { findUserById, getSavedOpportunities, getUserApplications, listOpportunities } from "@/lib/database";
import { ApplicationEmailRetry } from "@/components/ApplicationEmailRetry";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=%2Fdashboard");
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== "LEARNER") redirect(role === "ADMIN" ? "/admin/dashboard" : "/employer/dashboard");

  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) redirect("/login?callbackUrl=%2Fdashboard");
  const [learner, applications, savedOpportunities, opportunities] = await Promise.all([
    findUserById(userId),
    getUserApplications(userId),
    getSavedOpportunities(userId),
    listOpportunities(),
  ]);
  if (!learner) redirect("/login?callbackUrl=%2Fdashboard");

  const applicationCounts = {
    total: applications.length,
    active: applications.filter((application) => !["successful", "unsuccessful", "accepted", "rejected", "placed"].includes(application.status)).length,
    successful: applications.filter((application) => ["successful", "accepted", "placed"].includes(application.status)).length,
  };
  const categoryLinks = [
    { category: "jobs", label: "Jobs" },
    { category: "learnerships", label: "Learnerships" },
    { category: "bursaries", label: "Bursaries" },
    { category: "funding", label: "Funding" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Dashboard</p>
          <h1 className="mt-3 font-display text-4xl text-forest">Welcome back, {learner?.fullName ?? "Learner"}</h1>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/profile" className="rounded-xl border border-forest/20 px-4 py-3 text-sm font-semibold text-forest hover:bg-cream2">
            Update profile
          </Link>
          <Link href="/opportunities?matched=true" className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-cream hover:bg-leaf">
            Browse matched opportunities
          </Link>
          <Link href="/opportunities" className="rounded-full border border-forest/20 px-5 py-3 text-sm font-medium text-forest hover:bg-cream2">
            Browse all opportunities
          </Link>
        </div>
      </div>

      <section aria-label="Application summary" className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-forest/10 bg-white p-4">
          <p className="text-sm text-inkSoft">Applications sent</p>
          <p className="mt-1 text-2xl font-semibold text-forest">{applicationCounts.total}</p>
        </div>
        <div className="rounded-xl border border-forest/10 bg-white p-4">
          <p className="text-sm text-inkSoft">Awaiting an outcome</p>
          <p className="mt-1 text-2xl font-semibold text-forest">{applicationCounts.active}</p>
        </div>
        <div className="rounded-xl border border-forest/10 bg-white p-4">
          <p className="text-sm text-inkSoft">Successful</p>
          <p className="mt-1 text-2xl font-semibold text-forest">{applicationCounts.successful}</p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-forest/10 bg-cream2/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-forest">Explore opportunities</h2>
            <p className="mt-1 text-sm text-inkSoft">{opportunities.length} currently open across all categories</p>
          </div>
          <Link href="/opportunities?matched=true" className="text-sm font-semibold text-forest underline-offset-4 hover:underline">See your best matches</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryLinks.map(({ category, label }) => (
            <Link key={category} href={`/opportunities?category=${category}`} className="rounded-lg border border-forest/15 bg-white px-3 py-2 text-sm font-medium text-forest hover:bg-cream">
              Browse {label}
            </Link>
          ))}
        </div>
      </section>

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
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-forest">My applications</h2>
            <span className="rounded-full bg-cream2 px-3 py-1 text-sm font-semibold text-forest">{applications.length}</span>
          </div>
          <div className="mt-5 space-y-4">
            {applications.length ? (
              applications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-forest/10 bg-cream p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf">{application.status.replaceAll("_", " ")}</p>
                      <h3 className="mt-1 text-xl font-semibold text-ink">{application.opportunityTitle ?? `Opportunity #${application.opportunityId}`}</h3>
                    </div>
                    <span className="inline-flex rounded-full bg-goldSoft px-2.5 py-1 text-xs font-semibold text-ink">
                      {application.matchScore ?? 0}% match
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-inkSoft">Applied {new Date(application.createdAt).toLocaleDateString()} · Updated {new Date(application.updatedAt ?? application.createdAt).toLocaleDateString()}</p>
                  <Link href={`/opportunities/${application.opportunityId}`} className="mt-2 inline-flex text-sm font-medium text-forest underline-offset-4 hover:underline">View opportunity</Link>
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
              <div className="rounded-2xl bg-cream p-5">
                <p className="text-inkSoft">You have not submitted any applications yet.</p>
                <Link href="/opportunities" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-leaf">
                  Find opportunities to apply
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-forest">Saved opportunities</h2>
            <p className="mt-1 text-sm text-inkSoft">Listings you saved to review later</p>
          </div>
          <span className="rounded-full bg-cream2 px-3 py-1 text-sm font-semibold text-forest">{savedOpportunities.length}</span>
        </div>
        {savedOpportunities.length ? (
          <ul className="mt-4 divide-y divide-forest/10">
            {savedOpportunities.map((opportunity) => (
              <li key={opportunity.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-leaf">{opportunity.category}</p>
                  <p className="mt-1 font-semibold text-ink">{opportunity.title}</p>
                  <p className="text-sm text-inkSoft">{opportunity.location ?? "Remote / flexible"} · Saved {new Date(opportunity.savedAt).toLocaleDateString()}</p>
                </div>
                <Link href={`/opportunities/${opportunity.id}`} className="text-sm font-semibold text-forest underline-offset-4 hover:underline">View listing</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-cream p-4 text-sm text-inkSoft">No saved opportunities yet. Save a listing from its details page and it will appear here.</p>
        )}
      </section>
    </main>
  );
}
