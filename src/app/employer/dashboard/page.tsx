import { EmployerStatusControls } from "@/components/EmployerStatusControls";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { findUserById, getEmployerApplications } from "@/lib/database";

export default async function EmployerDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const employer = userId ? await findUserById(userId) : undefined;
  const applications = userId && (role === "EMPLOYER" || role === "ADMIN")
    ? await getEmployerApplications(userId, role === "ADMIN")
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Employer dashboard</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Welcome, {employer?.fullName ?? "Employer"}</h1>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-forest">Applicants</h2>
          <button type="button" className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-cream hover:bg-leaf">
            Post opportunity
          </button>
        </div>

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
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <span className="rounded-full bg-goldSoft px-3 py-1 text-sm font-semibold text-ink">
                    {application.matchScore ?? 0}% qualification match
                  </span>
                  <EmployerStatusControls applicationId={application.id} initialStatus={application.status} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
