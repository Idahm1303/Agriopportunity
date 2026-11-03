import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getAdminSystemHealth } from "@/lib/admin";
import { getAuditEntries } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { getAdminDocuments, getAdminUsers, getEmployerApplications, getEmployerOpportunities } from "@/lib/database";
import { opportunityTypeLabels, opportunityTypes } from "@/lib/agri-options";
import { AdminUserControls } from "@/components/AdminUserControls";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";
import { AdminUserVerificationControl } from "@/components/AdminUserVerificationControl";
import type { Role } from "@/lib/mock-data";

const adminRoles: Role[] = ["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER", "ADMIN"];

const applicationStatuses = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "accepted", label: "Accepted" },
  { value: "successful", label: "Successful" },
  { value: "rejected", label: "Rejected" },
  { value: "unsuccessful", label: "Unsuccessful" },
  { value: "placed", label: "Placed" },
] as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    category?: string;
    status?: string;
    opportunityId?: string;
    documentQuery?: string;
    documentType?: string;
    documentPage?: string;
    userQuery?: string;
    userRole?: string;
    userPage?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; userId?: string } | undefined;
  if (!session || user?.role !== "ADMIN") redirect("/login?callbackUrl=/admin/dashboard");

  const query = await searchParams;
  const action = query.action ?? "";
  const entityType = query.entityType ?? "";
  const category = query.category ?? "all";
  const status = applicationStatuses.some((option) => option.value === query.status) ? query.status : "";
  const opportunityId = query.opportunityId ?? "";
  const documentQuery = query.documentQuery?.trim().slice(0, 100) ?? "";
  const documentType = query.documentType ?? "";
  const requestedDocumentPage = Number.parseInt(query.documentPage ?? "1", 10);
  const documentPage = Number.isSafeInteger(requestedDocumentPage) && requestedDocumentPage > 0
    ? requestedDocumentPage
    : 1;
  const userQuery = query.userQuery?.trim().slice(0, 100) ?? "";
  const userRole = adminRoles.find((role) => role === query.userRole);
  const requestedUserPage = Number.parseInt(query.userPage ?? "1", 10);
  const userPage = Number.isSafeInteger(requestedUserPage) && requestedUserPage > 0 ? requestedUserPage : 1;
  const [auditEntries, applications, opportunities, documentResults, systemHealth, userResults] = await Promise.all([
    getAuditEntries({ action: action || undefined, entityType: entityType || undefined }),
    getEmployerApplications(user.userId ?? "", true, {
      category,
      status,
      opportunityId,
    }),
    getEmployerOpportunities(user.userId ?? "", true),
    getAdminDocuments({ query: documentQuery, documentType, page: documentPage }),
    getAdminSystemHealth(),
    getAdminUsers({ query: userQuery, role: userRole, page: userPage }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Admin control centre</p>
        <h1 className="mt-3 font-display text-4xl text-forest">All system activity</h1>
        <p className="mt-2 text-inkSoft">Review applications, opportunities, statuses, placements, and notification records.</p>
      </div>

      <section className="mb-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10" aria-labelledby="system-health-heading">
        <h2 id="system-health-heading" className="font-display text-2xl text-forest">System health</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-cream p-4">
            <p className="text-sm text-inkSoft">Database</p>
            <p className={`mt-1 font-semibold ${systemHealth.database === "available" ? "text-forest" : "text-red-700"}`}>
              {systemHealth.database === "available" ? "Available" : "Unavailable"}
            </p>
            <p className="mt-1 text-xs text-inkSoft">Response: {systemHealth.databaseResponseTimeMs} ms</p>
          </div>
          <div className="rounded-2xl bg-cream p-4">
            <p className="text-sm text-inkSoft">Document storage configuration</p>
            <p className={`mt-1 font-semibold ${systemHealth.storageConfigured ? "text-forest" : "text-red-700"}`}>
              {systemHealth.storageConfigured ? "Configured" : "Not configured"}
            </p>
          </div>
          <p className="self-center text-xs text-inkSoft sm:text-right">
            Checked {systemHealth.checkedAt.toLocaleString()}
          </p>
        </div>
      </section>

      <details
        className="group rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10"
        open={Boolean(action || entityType || category !== "all" || status || opportunityId)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-forest marker:hidden">
          <span>Filter what you want to see</span>
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <form method="get" className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-leaf">Applications</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-ink">
              Opportunity type
              <select name="category" defaultValue={category} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm">
                <option value="all">All types</option>
                {opportunityTypes.map((type) => <option key={type} value={type}>{opportunityTypeLabels[type]}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-ink">
              Specific opportunity
              <select name="opportunityId" defaultValue={opportunityId} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm">
                <option value="">All opportunities</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.title} · {opportunity.category}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink">
              Application status
              <select name="status" defaultValue={status} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm">
                <option value="">All statuses</option>
                {applicationStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-leaf">Audit trail</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-ink">
              Action
              <input name="action" defaultValue={action} placeholder="e.g. application_verified" className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium text-ink">
              Entity
              <select name="entityType" defaultValue={entityType} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm">
                <option value="">All entities</option>
                <option value="application">Application</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">
              Apply filters
            </button>
            <a href="/admin/dashboard" className="text-sm font-medium text-forest underline">Clear filters</a>
          </div>
        </form>
      </details>

      <section id="users-heading" className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <div>
          <h2 className="font-display text-2xl text-forest">User accounts ({userResults.total})</h2>
          <p className="mt-1 text-sm text-inkSoft">Search user accounts, review assigned roles, and manage organisation verification.</p>
        </div>
        <form method="get" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm font-medium text-ink">
            Search users
            <input name="userQuery" defaultValue={userQuery} placeholder="Name, email, or organisation" className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-ink">
            Account role
            <select name="userRole" defaultValue={userRole ?? ""} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm">
              <option value="">All roles</option>
              {adminRoles.map((role) => <option key={role} value={role}>{role === "ADMIN" ? "Administrator" : role.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <div className="flex gap-3">
            <button className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">Filter users</button>
            <a href="/admin/dashboard#users-heading" className="self-center text-sm font-medium text-forest underline">Clear</a>
          </div>
        </form>

        <div className="mt-4 divide-y divide-forest/10">
          {userResults.users.length ? userResults.users.map((account) => {
            const assignedRoles = account.roles.map(({ role }) => role);
            if (!assignedRoles.includes(account.role)) assignedRoles.push(account.role);
            return (
              <article key={account.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{account.fullName}</p>
                  <p className="break-all text-sm text-inkSoft">{account.email}{account.organizationName ? ` · ${account.organizationName}` : ""}</p>
                  <p className="mt-1 text-xs text-inkSoft">
                    {assignedRoles.map((role) => role === "ADMIN" ? "Administrator" : role).join(", ")} · Joined {account.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="w-full max-w-xl space-y-3">
                  <AdminUserControls
                    key={`${account.id}-${account.accountStatus}-${assignedRoles.join("-")}`}
                    userId={account.id}
                    adminId={user.userId ?? ""}
                    accountStatus={account.accountStatus}
                    accountStatusReason={account.accountStatusReason}
                    assignedRoles={assignedRoles}
                  />
                  {assignedRoles.some((role) => role === "EMPLOYER" || role === "PROVIDER") ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-inkSoft">Organisation verification</span>
                      <AdminUserVerificationControl userId={account.id} initialStatus={account.verificationStatus} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          }) : <p className="py-5 text-sm text-inkSoft">No user accounts match these filters.</p>}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-inkSoft">
          {userResults.page > 1 ? (
            <a href={`?userQuery=${encodeURIComponent(userQuery)}&userRole=${encodeURIComponent(userRole ?? "")}&userPage=${userResults.page - 1}#users-heading`} className="font-medium text-forest underline">Previous</a>
          ) : <span />}
          <span>Page {userResults.page} of {userResults.totalPages}</span>
          {userResults.page < userResults.totalPages ? (
            <a href={`?userQuery=${encodeURIComponent(userQuery)}&userRole=${encodeURIComponent(userRole ?? "")}&userPage=${userResults.page + 1}#users-heading`} className="font-medium text-forest underline">Next</a>
          ) : <span />}
        </div>
      </section>

      <AdminSettingsPanel />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
          <h2 className="font-display text-2xl text-forest">Applications ({applications.length})</h2>
          <div className="mt-4 space-y-3">
            {applications.length ? applications.map((application) => (
              <article key={application.id} className="rounded-2xl bg-cream p-4">
                <p className="font-medium text-ink">{application.applicantName} · {application.opportunityTitle}</p>
                <p className="text-sm text-inkSoft">{application.status} · {application.matchScore ?? 0}% match · {application.applicantEmail}</p>
                <p className="text-xs text-inkSoft">Verified: {application.verifiedAt ? "Yes" : "No"} · Placed: {application.placedAt ? "Yes" : "No"}</p>
              </article>
            )) : <p className="text-sm text-inkSoft">No applications match these filters.</p>}
          </div>
        </section>
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
          <h2 className="font-display text-2xl text-forest">Opportunities ({opportunities.length})</h2>
          <div className="mt-4 space-y-3">{opportunities.filter((opportunity) => category === "all" || opportunity.category === category).map((opportunity) => <article key={opportunity.id} className="rounded-2xl bg-cream p-4"><p className="font-medium text-ink">{opportunity.title}</p><p className="text-sm text-inkSoft">{opportunity.category} · {opportunity.status} · {opportunity.expiresAt ? `Closes ${new Date(opportunity.expiresAt).toLocaleDateString()}` : "No closing date"}</p></article>)}</div>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10" aria-labelledby="documents-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="documents-heading" className="font-display text-2xl text-forest">Uploaded documents ({documentResults.total})</h2>
            <p className="mt-1 text-sm text-inkSoft">Private documents from applicant profiles and applications. Downloads are recorded in the audit trail.</p>
          </div>
        </div>
        <form method="get" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm font-medium text-ink">
            Search documents
            <input
              name="documentQuery"
              defaultValue={documentQuery}
              placeholder="Filename, applicant, email, or opportunity"
              className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Document type
            <select name="documentType" defaultValue={documentType} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm">
              <option value="">All document types</option>
              {documentResults.documentTypes.map((type) => (
                <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <button className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">Filter documents</button>
            <a href="/admin/dashboard#documents-heading" className="self-center text-sm font-medium text-forest underline">Clear</a>
          </div>
        </form>

        <div className="mt-4 divide-y divide-forest/10">
          {documentResults.documents.length ? documentResults.documents.map((document) => (
            <article key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="break-all font-medium text-ink">{document.fileName}</p>
                <p className="mt-1 text-sm text-inkSoft">
                  {document.documentType.replaceAll("_", " ")} · {document.user.fullName} ({document.user.email})
                  {document.opportunity ? ` · ${document.opportunity.title}` : ""}
                </p>
                <p className="mt-1 text-xs text-inkSoft">{document.createdAt.toLocaleString()}</p>
              </div>
              <a
                href={`/api/v1/admin/documents/${encodeURIComponent(document.id)}`}
                className="shrink-0 rounded-full border border-forest/20 px-4 py-2 text-sm font-medium text-forest hover:bg-cream"
              >
                Download
              </a>
            </article>
          )) : <p className="py-5 text-sm text-inkSoft">No documents match these filters.</p>}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-inkSoft">
          {documentResults.page > 1 ? (
            <a href={`?documentQuery=${encodeURIComponent(documentQuery)}&documentType=${encodeURIComponent(documentType)}&documentPage=${documentResults.page - 1}#documents-heading`} className="font-medium text-forest underline">Previous</a>
          ) : <span />}
          <span>Page {documentResults.page} of {documentResults.totalPages}</span>
          {documentResults.page < documentResults.totalPages ? (
            <a href={`?documentQuery=${encodeURIComponent(documentQuery)}&documentType=${encodeURIComponent(documentType)}&documentPage=${documentResults.page + 1}#documents-heading`} className="font-medium text-forest underline">Next</a>
          ) : <span />}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <h2 className="font-display text-2xl text-forest">Audit trail ({auditEntries.length})</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-forest/10 text-inkSoft"><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Performed by</th><th className="p-3">Details</th></tr></thead><tbody>{auditEntries.map((entry) => <tr key={entry.id} className="border-b border-forest/10"><td className="p-3 text-inkSoft">{new Date(entry.createdAt).toLocaleString()}</td><td className="p-3 font-medium text-ink">{entry.action}</td><td className="p-3 text-inkSoft">{entry.entityType}</td><td className="p-3 text-inkSoft">{entry.performedBy ?? "System"}</td><td className="p-3 text-inkSoft">{entry.details ?? ""}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
