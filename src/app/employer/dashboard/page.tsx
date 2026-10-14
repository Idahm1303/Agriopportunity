import { EmployerStatusControls } from "@/components/EmployerStatusControls";
import { EmployerOpportunityForm } from "@/components/EmployerOpportunityForm";
import { EmployerOpportunityControls } from "@/components/EmployerOpportunityControls";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { findUserById, getEmployerApplications, getEmployerOpportunities } from "@/lib/database";

export default async function EmployerDashboardPage({ searchParams }: { searchParams: Promise<{ category?: string | string[]; field?: string | string[]; verification?: string | string[] }> }) {
  const query = await searchParams;
  const category = Array.isArray(query.category) ? query.category[0] ?? "all" : query.category ?? "all";
  const field = Array.isArray(query.field) ? query.field[0] ?? "all" : query.field ?? "all";
  const verification = Array.isArray(query.verification) ? query.verification[0] ?? "all" : query.verification ?? "all";
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect("/login?callbackUrl=/employer/dashboard");
  if (role !== "EMPLOYER" && role !== "ADMIN") redirect("/dashboard");
  const employer = userId ? await findUserById(userId) : undefined;
  const [applications, opportunities] = userId
    ? await Promise.all([
        getEmployerApplications(userId, role === "ADMIN", {
          category,
          field: field === "all" ? undefined : field,
          verification,
        }),
        getEmployerOpportunities(userId, role === "ADMIN"),
      ])
    : [[], []];
  const availableFields = Array.from(new Set(opportunities.flatMap((opportunity) => opportunity.requiredSkills))).sort((left, right) => left.localeCompare(right));
  const applicationGroups = [
    { category: "job", label: "Jobs" },
    { category: "learnership", label: "Learnerships" },
    { category: "bursary", label: "Bursaries" },
    { category: "funding", label: "Funding" },
  ].map((group) => ({
    ...group,
    applications: applications.filter((application) => application.opportunityCategory === group.category),
  })).filter((group) => group.applications.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Employer dashboard</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Welcome, {employer?.fullName ?? "Employer"}</h1>
        <p className="mt-2 text-inkSoft">{employer?.organizationName ?? "Your organisation"}</p>
        {employer?.phoneNumber ? <p className="mt-1 text-sm text-inkSoft">Contact: {employer.phoneNumber} · Region: {employer.location ?? "Not specified"}</p> : null}
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-forest">Applicants</h2>
          <EmployerOpportunityForm />
        </div>

        <form className="mb-6 grid gap-3 rounded-xl bg-cream p-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
          <label htmlFor="category" className="text-sm font-medium text-ink">Opportunity category
          <select id="category" name="category" defaultValue={category} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm text-ink">
            <option value="all">All categories</option><option value="job">Job</option><option value="learnership">Learnership</option><option value="bursary">Bursary</option><option value="funding">Funding</option>
          </select>
          </label>
          <label htmlFor="field" className="text-sm font-medium text-ink">Field of interest
            <select id="field" name="field" defaultValue={field} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm text-ink">
              <option value="all">All fields</option>
              {availableFields.map((availableField) => <option key={availableField} value={availableField}>{availableField}</option>)}
            </select>
          </label>
          <label htmlFor="verification" className="text-sm font-medium text-ink">Qualification verification
            <select id="verification" name="verification" defaultValue={verification} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm text-ink">
              <option value="all">All applicants</option><option value="verified">Verified</option><option value="unverified">Not verified</option>
            </select>
          </label>
          <div className="flex items-end"><button className="w-full rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf">Apply filters</button></div>
          <p className="text-sm text-inkSoft sm:col-span-2 lg:col-span-4">Applicants are sorted from highest to lowest qualification match. Status changes email applicants automatically.</p>
        </form>

        <div className="space-y-4">
          {!applications.length ? <p className="rounded-xl bg-cream p-5 text-sm text-inkSoft">No applicants match these filters yet.</p> : null}
          {applicationGroups.map((group) => (
            <section key={group.category} aria-label={`${group.label} applicants`}>
              <h3 className="mb-3 font-display text-xl text-forest">{group.label} ({group.applications.length})</h3>
              <div className="space-y-4">
                {group.applications.map((application) => (
                  <article key={application.id} className="rounded-2xl border border-forest/10 bg-cream p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf">Applicant</p>
                        <h4 className="mt-1 text-xl font-semibold text-ink">{application.applicantName ?? application.userId}</h4>
                        <p className="mt-1 text-sm text-inkSoft">Selected opportunity: {application.opportunityTitle ?? application.opportunityId}</p>
                        <p className="mt-1 text-sm text-inkSoft">Qualification document: {application.qualificationDocumentName ?? "Not provided"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Qualifications: {application.applicantQualifications?.length ? application.applicantQualifications.join(", ") : application.extractedQualifications.join(", ") || "Not provided"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Verification: {application.verifiedAt ? "Verified" : "Not verified"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Matched skills: {application.matchedSkills.length ? application.matchedSkills.join(", ") : "No required skills found"}</p>
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
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <h2 className="font-display text-2xl text-forest">Your opportunities</h2>
        <div className="mt-5 space-y-3">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream p-4">
              <div><p className="font-medium text-ink">{opportunity.title}</p><p className="text-sm text-inkSoft">{opportunity.category} · {opportunity.status} · {opportunity.location ?? "Remote / flexible"}</p></div>
              <EmployerOpportunityControls
                opportunityId={opportunity.id}
                status={opportunity.status}
                title={opportunity.title}
                description={opportunity.description}
                category={opportunity.category}
                applicationEmail={opportunity.applicationEmail}
                location={opportunity.location}
                requiredSkills={opportunity.requiredSkills}
                expiresAt={opportunity.expiresAt?.toISOString().slice(0, 10) ?? ""}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
