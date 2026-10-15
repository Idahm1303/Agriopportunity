import { EmployerStatusControls } from "@/components/EmployerStatusControls";
import { EmployerOpportunityForm } from "@/components/EmployerOpportunityForm";
import { EmployerOpportunityControls } from "@/components/EmployerOpportunityControls";
import { EmployerGrantApplicationForm } from "@/components/EmployerGrantApplicationForm";
import { ApplicationEmailRetry } from "@/components/ApplicationEmailRetry";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { findUserById, getEmployerApplications, getEmployerFundingOpportunities, getEmployerOpportunities, getUserGrantApplications } from "@/lib/database";
import { opportunityTypeLabels, opportunityTypes } from "@/lib/agri-options";
import { additionalGrantDocuments, standardGrantDocuments } from "@/lib/grant-application";

function eligibilityDescription(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const description = (value as Record<string, unknown>).description;
  return typeof description === "string" ? description : null;
}

export default async function EmployerDashboardPage({ searchParams }: { searchParams: Promise<{ category?: string | string[]; field?: string | string[]; verification?: string | string[] }> }) {
  const query = await searchParams;
  const category = Array.isArray(query.category) ? query.category[0] ?? "all" : query.category ?? "all";
  const field = Array.isArray(query.field) ? query.field[0] ?? "all" : query.field ?? "all";
  const verification = Array.isArray(query.verification) ? query.verification[0] ?? "all" : query.verification ?? "all";
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) redirect("/login?callbackUrl=/employer/dashboard");
  if (role !== "EMPLOYER" && role !== "PROVIDER" && role !== "ADMIN") redirect("/dashboard");
  const employer = userId ? await findUserById(userId) : undefined;
  const [applications, opportunities, grantOpportunities, grantApplications] = userId
    ? await Promise.all([
        getEmployerApplications(userId, role === "ADMIN", {
          category,
          field: field === "all" ? undefined : field,
          verification,
        }),
        getEmployerOpportunities(userId, role === "ADMIN"),
        getEmployerFundingOpportunities(),
        role === "EMPLOYER" ? getUserGrantApplications(userId) : Promise.resolve([]),
      ])
    : [[], [], [], []];
  const availableFields = Array.from(new Set(opportunities.flatMap((opportunity) => opportunity.requiredSkills))).sort((left, right) => left.localeCompare(right));
  const applicationGroups = opportunityTypes.map((category) => ({
    category,
    label: opportunityTypeLabels[category],
    applications: applications.filter((application) => application.opportunityCategory === category),
  })).filter((group) => group.applications.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">{role === "PROVIDER" ? "Training provider dashboard" : "Employer dashboard"}</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Welcome, {employer?.fullName ?? (role === "PROVIDER" ? "Provider" : "Employer")}</h1>
        <p className="mt-2 text-inkSoft">{employer?.organizationName ?? "Your organisation"}</p>
        {employer?.phoneNumber ? <p className="mt-2 text-sm text-inkSoft">Contact: {employer.phoneNumber} · Region: {employer.location ?? "Not specified"}</p> : null}
      </div>

      <section id="applicants" className="scroll-mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-forest">Applicants</h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link href="/employer/dashboard?category=all&field=all&verification=all#application-list" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-forest/20 px-4 py-2 text-sm font-semibold text-forest transition hover:bg-cream2">
              See all applications
            </Link>
            <EmployerOpportunityForm />
          </div>
        </div>

        <form className="mb-6 grid gap-3 rounded-xl bg-cream p-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
          <label htmlFor="category" className="text-sm font-medium text-ink">Opportunity category
          <select id="category" name="category" defaultValue={category} className="mt-1 block w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-2 text-sm text-ink">
            <option value="all">All categories</option>
            {opportunityTypes.map((type) => <option key={type} value={type}>{opportunityTypeLabels[type]}</option>)}
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

        <div id="application-list" className="scroll-mt-6 space-y-4">
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
                        <p className="mt-1 text-sm text-inkSoft">Closing date: {application.opportunityClosingDate ? new Date(application.opportunityClosingDate).toLocaleDateString("en-ZA", { timeZone: "UTC" }) : "Not set"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Qualification document: {application.qualificationDocumentName ?? "Not provided"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Qualifications: {application.applicantQualifications?.length ? application.applicantQualifications.join(", ") : application.extractedQualifications.join(", ") || "Not provided"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Verification: {application.verifiedAt ? "Verified" : "Not verified"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Matched skills: {application.matchedSkills.length ? application.matchedSkills.join(", ") : "No required skills found"}</p>
                        <p className="mt-1 text-sm text-inkSoft">Email: {application.applicantEmail}</p>
                        {application.applicationData && typeof application.applicationData === "object" && !Array.isArray(application.applicationData) ? (
                          <div className="mt-3 rounded-xl bg-white p-3 text-sm text-inkSoft">
                            <p className="font-semibold text-ink">Grant applicant: {String((application.applicationData as Record<string, unknown>).companyName ?? "Company")}</p>
                            <p>Company registration: {String((application.applicationData as Record<string, unknown>).registrationNumber ?? "Not provided")} · SDL: {String((application.applicationData as Record<string, unknown>).sdlNumber ?? "Not provided")}</p>
                            <p>Amount requested: R{String((application.applicationData as Record<string, unknown>).requestedAmount ?? "Not provided")}</p>
                          </div>
                        ) : null}
                        {application.documents?.length ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {application.documents.map((document) => (
                              <li key={document.id}><a href={`/api/v1/applications/${application.id}/documents/${document.id}`} className="text-sm font-medium text-forest underline">{document.fileName}</a></li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <span className="rounded-full bg-goldSoft px-3 py-1 text-sm font-semibold text-ink">
                          {application.matchScore ?? 0}% qualification match
                        </span>
                        <EmployerStatusControls applicationId={application.id} initialStatus={application.status} closingDate={application.opportunityClosingDate} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      {role === "EMPLOYER" ? (
        <>
          <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-leaf">Employer funding support</p>
              <h2 className="mt-2 font-display text-2xl text-forest">Funding and grant opportunities</h2>
              <p className="mt-2 max-w-3xl text-sm text-inkSoft">Review available agricultural funding calls and apply for your company here. Each call can require extra documents. The standard checklist is a guide; confirm eligibility and call-specific requirements before applying.</p>
            </div>
            {grantOpportunities.length ? (
              <div className="space-y-4">
                {grantOpportunities.map((opportunity) => {
                  const submittedApplication = grantApplications.find((application) => application.opportunityId === opportunity.id);
                  const extraDocuments = additionalGrantDocuments(opportunity.eligibilityCriteria);
                  return (
                    <article key={opportunity.id} className="rounded-2xl bg-cream p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leaf">{opportunity.type === "funding_call" ? "Funding call" : "Funding grant"}</p>
                          <h3 className="mt-1 font-display text-xl text-forest">{opportunity.title}</h3>
                          <p className="mt-1 text-sm text-inkSoft">Provider: {opportunity.organizationName ?? "Funding provider"}{opportunity.fundingAmountRange ? ` · Funding: ${opportunity.fundingAmountRange}` : ""}</p>
                          <p className="mt-1 text-sm text-inkSoft">Closing date: {opportunity.closingDate ? new Date(opportunity.closingDate).toLocaleDateString("en-ZA", { timeZone: "UTC" }) : "Not specified"}</p>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-inkSoft">{opportunity.description}</p>
                      {eligibilityDescription(opportunity.eligibilityCriteria) ? <p className="mt-3 text-sm text-inkSoft"><span className="font-semibold text-ink">Eligibility:</span> {eligibilityDescription(opportunity.eligibilityCriteria)}</p> : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-forest">View required grant documents</summary>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-inkSoft">
                          {standardGrantDocuments.map((document) => <li key={document.key}>{document.label}{document.required ? " (required)" : " (if applicable)"}</li>)}
                          {extraDocuments.map((document) => <li key={document}>{document} (required for this call)</li>)}
                        </ul>
                      </details>
                      <EmployerGrantApplicationForm
                        opportunity={{
                          id: opportunity.id,
                          title: opportunity.title,
                          description: opportunity.description,
                          type: opportunity.type ?? "funding",
                          closingDate: opportunity.closingDate ?? null,
                          fundingAmountRange: opportunity.fundingAmountRange ?? null,
                          eligibilityCriteria: opportunity.eligibilityCriteria,
                          organizationName: opportunity.organizationName ?? null,
                        }}
                        company={{
                          companyName: employer?.organizationName ?? "",
                          companyAddress: employer?.address ?? employer?.location ?? "",
                          province: employer?.province ?? "",
                          contactName: employer?.fullName ?? "",
                          contactEmail: employer?.email ?? "",
                          contactPhone: employer?.phoneNumber ?? "",
                        }}
                        alreadyApplied={Boolean(submittedApplication)}
                      />
                    </article>
                  );
                })}
              </div>
            ) : <p className="rounded-xl bg-cream p-4 text-sm text-inkSoft">There are no open funding or grant opportunities at the moment. New calls will appear here when published.</p>}
          </section>

          <section id="grant-applications" className="mt-6 scroll-mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10">
            <h2 className="font-display text-2xl text-forest">Your grant applications ({grantApplications.length})</h2>
            <div className="mt-4 space-y-3">
              {grantApplications.map((application) => (
                <article key={application.id} className="rounded-xl bg-cream p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{application.opportunityTitle ?? "Grant opportunity"}</h3>
                      <p className="text-sm capitalize text-inkSoft">Status: {application.status.replaceAll("_", " ")}</p>
                      <p className="text-xs text-inkSoft">Submitted {new Date(application.createdAt).toLocaleDateString("en-ZA")}</p>
                    </div>
                    {application.emailError ? <p className="text-xs text-red-700">{application.emailError}</p> : null}
                  </div>
                  <ApplicationEmailRetry applicationId={application.id} pending={Boolean(application.emailError)} />
                  {application.documents.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {application.documents.map((document) => (
                        <li key={document.id}>
                          <a href={`/api/v1/applications/${application.id}/documents/${document.id}`} className="text-sm font-medium text-forest underline">{document.fileName}</a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
              {!grantApplications.length ? <p className="text-sm text-inkSoft">Your grant submissions and status updates will appear here.</p> : null}
            </div>
          </section>
        </>
      ) : null}

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
                type={opportunity.type}
                applicationEmail={opportunity.applicationEmail}
                location={opportunity.location}
                province={opportunity.province}
                targetAudience={opportunity.targetAudience}
                closingDate={opportunity.closingDate?.toISOString() ?? null}
                fundingAmountRange={opportunity.fundingAmountRange}
                eligibilityCriteria={opportunity.eligibilityCriteria}
                applyUrl={opportunity.applyUrl}
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
