import { EmployerStatusControls } from "@/components/EmployerStatusControls";
import { EmployerOpportunityForm } from "@/components/EmployerOpportunityForm";
import { EmployerOpportunityControls } from "@/components/EmployerOpportunityControls";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { findUserById, getEmployerApplications, getEmployerOpportunities } from "@/lib/database";

export default async function EmployerDashboardPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const query = await searchParams;
  const category = Array.isArray(query.category) ? query.category[0] ?? "all" : query.category ?? "all";
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect("/login?callbackUrl=/employer/dashboard");
  if (role !== "EMPLOYER" && role !== "ADMIN") redirect("/dashboard");
  const employer = userId ? await findUserById(userId) : undefined;
  const applications = userId && (role === "EMPLOYER" || role === "ADMIN")
    ? await getEmployerApplications(userId, role === "ADMIN", category)
    : [];
  const opportunities = userId && (role === "EMPLOYER" || role === "ADMIN")
    ? await getEmployerOpportunities(userId, role === "ADMIN")
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Employer dashboard</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Welcome, {employer?.fullName ?? "Employer"}</h1>
        <p className="mt-2 text-inkSoft">{employer?.organizationName ?? "Your organisation"}</p>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-forest">Applicants</h2>
          <EmployerOpportunityForm />
        </div>

        <form className="mb-6 flex flex-wrap items-center gap-3" method="get">
          <label htmlFor="category" className="text-sm font-medium text-ink">Filter by category</label>
          <select id="category" name="category" defaultValue={category} className="rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm text-ink">
            <option value="all">All categories</option><option value="job">Job</option><option value="learnership">Learnership</option><option value="bursary">Bursary</option><option value="funding">Funding</option>
          </select>
          <button className="rounded-full border border-forest/20 px-4 py-2 text-sm font-medium text-forest">Filter</button>
          <span className="text-sm text-inkSoft">Applications are ranked by qualification match.</span>
        </form>

        <div className="space-y-4">
          {applications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-forest/10 bg-cream p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf">Applicant</p>
                  <h3 className="mt-1 text-xl font-semibold text-ink">{application.applicantName ?? application.userId}</h3>
                  <p className="mt-1 text-sm text-inkSoft">
                    {application.opportunityTitle ?? application.opportunityId}
                  </p>
                  <p className="mt-2 text-sm text-inkSoft">
                    Document: {application.qualificationDocumentName ?? "Not available"}
                  </p>
                  <p className="mt-1 text-sm text-inkSoft">
                    Matched skills: {application.matchedSkills.length ? application.matchedSkills.join(", ") : "No required skills found"}
                  </p>
                  <p className="mt-1 text-sm text-inkSoft">Email: {application.applicantEmail}</p>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <span className="rounded-full bg-goldSoft px-3 py-1 text-sm font-semibold text-ink">
                    {application.matchScore ?? 0}% qualification match
                  </span>
                  <EmployerStatusControls applicationId={application.id} initialStatus={application.status} initialVerified={Boolean(application.verifiedAt)} initialPlaced={Boolean(application.placedAt)} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <h2 className="font-display text-2xl text-forest">Your opportunities</h2>
        <div className="mt-5 space-y-3">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream p-4">
              <div><p className="font-medium text-ink">{opportunity.title}</p><p className="text-sm text-inkSoft">{opportunity.category} · {opportunity.status}</p></div>
              <EmployerOpportunityControls opportunityId={opportunity.id} status={opportunity.status} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
