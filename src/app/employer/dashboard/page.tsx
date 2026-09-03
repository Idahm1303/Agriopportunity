import { EmployerStatusControls } from "@/components/EmployerStatusControls";
import { getDemoApplications, getDemoUsers } from "@/lib/mock-data";

export default function EmployerDashboardPage() {
  const employer = getDemoUsers().find((user) => user.role === "EMPLOYER");
  const applications = getDemoApplications();

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
                  <h3 className="mt-1 text-xl font-semibold text-ink">User {application.userId}</h3>
                </div>
                <EmployerStatusControls applicationId={application.id} initialStatus={application.status} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
