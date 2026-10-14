import Link from "next/link";
import { getServerSession } from "next-auth";

import { ApplyButton } from "@/components/ApplyButton";
import { OpportunityActions } from "@/components/OpportunityActions";
import { authOptions } from "@/lib/auth";
import { findUserById, getMatchScoreForOpportunity, getOpportunityById } from "@/lib/database";
import { opportunityTypeLabels } from "@/lib/agri-options";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { userId?: string; role?: string } | undefined;
  const userId = sessionUser?.userId;
  const [opportunity, learner] = await Promise.all([
    getOpportunityById(id),
    userId ? findUserById(userId) : Promise.resolve(undefined),
  ]);

  if (!opportunity) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-lg text-inkSoft">Opportunity not found.</p>
      </main>
    );
  }

  const matchScore = learner ? await getMatchScoreForOpportunity(learner.id, opportunity.id, sessionUser?.role as import("@/lib/mock-data").Role | undefined) : 0;
  const closeDate = opportunity.closingDate ?? opportunity.expiresAt;
  const eligibilityDescription = opportunity.eligibilityCriteria && typeof opportunity.eligibilityCriteria === "object" &&
    "description" in opportunity.eligibilityCriteria && typeof opportunity.eligibilityCriteria.description === "string"
    ? opportunity.eligibilityCriteria.description
    : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/opportunities" className="mb-6 inline-flex text-sm font-medium text-forest underline-offset-4 hover:underline">
        ← Back to opportunities
      </Link>

      <article className="rounded-[2rem] bg-white p-6 shadow-lg ring-1 ring-forest/10 md:p-8">
        <div className="flex flex-col gap-4 border-b border-forest/10 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">{opportunityTypeLabels[opportunity.type ?? "job"]}</p>
            <h1 className="mt-3 font-display text-4xl text-forest">{opportunity.title}</h1>
          </div>
          <span className="rounded-full bg-cream px-3 py-2 text-sm font-semibold text-forest">{matchScore}% match</span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h2 className="font-display text-2xl text-forest">Opportunity overview</h2>
            <p className="mt-4 text-base leading-8 text-inkSoft">{opportunity.description}</p>

            <div className="mt-8">
              <h3 className="font-display text-xl text-forest">Required skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {opportunity.requiredSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-cream2 px-3 py-1.5 text-sm text-inkSoft">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl bg-cream p-5">
            <dl className="space-y-4 text-sm text-inkSoft">
              <div>
                <dt className="font-medium text-ink">Location</dt>
                <dd>{[opportunity.location, opportunity.province].filter(Boolean).join(", ") || "National / flexible"}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Organisation</dt>
                <dd>{opportunity.organizationName ?? "Provider"}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Closing date</dt>
                <dd>{closeDate ? new Date(closeDate).toLocaleDateString() : "Not specified"}</dd>
              </div>
              {opportunity.fundingAmountRange ? <div><dt className="font-medium text-ink">Funding range</dt><dd>{opportunity.fundingAmountRange}</dd></div> : null}
              {opportunity.targetAudience?.length ? <div><dt className="font-medium text-ink">Who can apply</dt><dd>{opportunity.targetAudience.join(", ")}</dd></div> : null}
              {eligibilityDescription ? <div><dt className="font-medium text-ink">Eligibility</dt><dd>{eligibilityDescription}</dd></div> : null}
              <div>
                <dt className="font-medium text-ink">Status</dt>
                <dd>{opportunity.status}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Posted</dt>
                <dd>{new Date(opportunity.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>

            <div className="mt-6">
              {["LEARNER", "FARMER", "SMME", "COOPERATIVE"].includes(sessionUser?.role ?? "") ? (
                <ApplyButton opportunityId={opportunity.id} />
              ) : (
                <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white">Create an applicant account to apply</Link>
              )}
              {opportunity.applyUrl ? <a href={opportunity.applyUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-forest/20 bg-white px-4 py-2 text-sm font-semibold text-forest">Apply on provider site</a> : null}
              <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-forest/20 bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:bg-cream2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft">
                Track application status
              </Link>
              <OpportunityActions opportunityId={opportunity.id} />
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
