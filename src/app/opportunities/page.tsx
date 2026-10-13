import { OpportunitiesBrowser } from "@/components/OpportunitiesBrowser";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { findUserById, listOpportunities } from "@/lib/database";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; matched?: string | string[] }>;
}) {
  const query = await searchParams;
  const category = Array.isArray(query.category) ? query.category[0] : query.category;
  const matched = Array.isArray(query.matched) ? query.matched[0] : query.matched;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  const [opportunities, learner] = await Promise.all([
    listOpportunities(),
    userId ? findUserById(userId) : Promise.resolve(undefined),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Explore</p>
          <h1 className="mt-3 font-display text-4xl text-forest">Opportunity marketplace</h1>
        </div>
        <a href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-forest/20 bg-white px-4 py-2 text-sm font-semibold text-forest shadow-sm transition hover:bg-cream2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft">
          Track application status
        </a>
      </div>

      <OpportunitiesBrowser
        opportunities={opportunities}
        currentUser={learner}
        initialCategory={category && ["job", "jobs", "learnership", "learnerships", "bursary", "bursaries", "funding"].includes(category) ? category : "jobs"}
        onlyMatched={matched === "true"}
      />
    </main>
  );
}
