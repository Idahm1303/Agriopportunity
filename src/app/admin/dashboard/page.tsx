import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getAuditEntries } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { getEmployerApplications, getEmployerOpportunities } from "@/lib/database";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; category?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; userId?: string } | undefined;
  if (!session || user?.role !== "ADMIN") redirect("/login?callbackUrl=/admin/dashboard");

  const query = await searchParams;
  const action = query.action ?? "";
  const entityType = query.entityType ?? "";
  const category = query.category ?? "all";
  const [auditEntries, applications, opportunities] = await Promise.all([
    getAuditEntries({ action: action || undefined, entityType: entityType || undefined }),
    getEmployerApplications(user.userId ?? "", true, category),
    getEmployerOpportunities(user.userId ?? "", true),
  ]);
  const filteredApplications = query.status ? applications.filter((application) => application.status === query.status) : applications;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Admin control centre</p>
        <h1 className="mt-3 font-display text-4xl text-forest">All system activity</h1>
        <p className="mt-2 text-inkSoft">Review applications, opportunities, statuses, placements, and notification records.</p>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-ink">Action<input name="action" defaultValue={action} placeholder="e.g. application_verified" className="mt-1 block rounded-xl border border-inkSoft/20 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-medium text-ink">Entity<select name="entityType" defaultValue={entityType} className="mt-1 block rounded-xl border border-inkSoft/20 px-3 py-2 text-sm"><option value="">All</option><option value="application">Application</option><option value="opportunity">Opportunity</option></select></label>
          <label className="text-sm font-medium text-ink">Category<select name="category" defaultValue={category} className="mt-1 block rounded-xl border border-inkSoft/20 px-3 py-2 text-sm"><option value="all">All</option><option value="job">Job</option><option value="learnership">Learnership</option><option value="bursary">Bursary</option><option value="funding">Funding</option></select></label>
          <label className="text-sm font-medium text-ink">Status<select name="status" defaultValue={query.status ?? ""} className="mt-1 block rounded-xl border border-inkSoft/20 px-3 py-2 text-sm"><option value="">All</option><option value="submitted">Submitted</option><option value="shortlisted">Shortlisted</option><option value="placed">Placed</option><option value="rejected">Rejected</option></select></label>
          <button className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream">Filter records</button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
          <h2 className="font-display text-2xl text-forest">Applications ({filteredApplications.length})</h2>
          <div className="mt-4 space-y-3">{filteredApplications.map((application) => <article key={application.id} className="rounded-2xl bg-cream p-4"><p className="font-medium text-ink">{application.applicantName} · {application.opportunityTitle}</p><p className="text-sm text-inkSoft">{application.status} · {application.matchScore ?? 0}% match · {application.applicantEmail}</p><p className="text-xs text-inkSoft">Verified: {application.verifiedAt ? "Yes" : "No"} · Placed: {application.placedAt ? "Yes" : "No"}</p></article>)}</div>
        </section>
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
          <h2 className="font-display text-2xl text-forest">Opportunities ({opportunities.length})</h2>
          <div className="mt-4 space-y-3">{opportunities.filter((opportunity) => category === "all" || opportunity.category === category).map((opportunity) => <article key={opportunity.id} className="rounded-2xl bg-cream p-4"><p className="font-medium text-ink">{opportunity.title}</p><p className="text-sm text-inkSoft">{opportunity.category} · {opportunity.status} · {opportunity.expiresAt ? `Closes ${new Date(opportunity.expiresAt).toLocaleDateString()}` : "No closing date"}</p></article>)}</div>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <h2 className="font-display text-2xl text-forest">Audit trail ({auditEntries.length})</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-forest/10 text-inkSoft"><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Performed by</th><th className="p-3">Details</th></tr></thead><tbody>{auditEntries.map((entry) => <tr key={entry.id} className="border-b border-forest/10"><td className="p-3 text-inkSoft">{new Date(entry.createdAt).toLocaleString()}</td><td className="p-3 font-medium text-ink">{entry.action}</td><td className="p-3 text-inkSoft">{entry.entityType}</td><td className="p-3 text-inkSoft">{entry.performedBy ?? "System"}</td><td className="p-3 text-inkSoft">{entry.details ?? ""}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
