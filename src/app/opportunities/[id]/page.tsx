import Link from "next/link";
import { getServerSession } from "next-auth";

import { ApplyButton } from "@/components/ApplyButton";
import { OpportunityActions } from "@/components/OpportunityActions";
import { authOptions } from "@/lib/auth";
import { findUserById, getMatchScoreForOpportunity, getOpportunityById } from "@/lib/database";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
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

  const matchScore = learner ? await getMatchScoreForOpportunity(learner.id, opportunity.id) : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/opportunities" className="mb-6 inline-flex text-sm font-medium text-forest underline-offset-4 hover:underline">
        ← Back to opportunities
      </Link>

      <article className="rounded-[2rem] bg-white p-6 shadow-lg ring-1 ring-forest/10 md:p-8">
        <div className="flex flex-col gap-4 border-b border-forest/10 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">{opportunity.category}</p>
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
                <dd>{opportunity.location ?? "Flexible / remote"}</dd>
              </div>
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
              <ApplyButton opportunityId={opportunity.id} />
              <OpportunityActions opportunityId={opportunity.id} />
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
