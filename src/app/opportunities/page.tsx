import { OpportunitiesBrowser } from "@/components/OpportunitiesBrowser";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { findUserById, getProfileRecommendations, listOpportunities } from "@/lib/database";
import type { Role } from "@/lib/mock-data";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; matched?: string | string[]; audience?: string | string[]; province?: string | string[] }>;
}) {
  const query = await searchParams;
  const category = Array.isArray(query.category) ? query.category[0] : query.category;
  const matched = Array.isArray(query.matched) ? query.matched[0] : query.matched;
  const audience = Array.isArray(query.audience) ? query.audience[0] : query.audience;
  const province = Array.isArray(query.province) ? query.province[0] : query.province;
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { userId?: string; role?: string } | undefined;
  const userId = sessionUser?.userId;
  const initialCategory = category ?? (
    sessionUser?.role === "SMME" || sessionUser?.role === "COOPERATIVE" ? "all" : "job"
  );
  const [opportunities, learner] = await Promise.all([
    userId ? getProfileRecommendations(userId, sessionUser?.role as Role | undefined) : listOpportunities(),
    userId ? findUserById(userId) : Promise.resolve(undefined),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Explore</p>
          <h1 className="mt-3 font-display text-4xl text-forest">Opportunities for every stage</h1>
          <p className="mt-2 text-inkSoft">Find jobs, training, business support, mentorship and funding.</p>
        </div>
        <a href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-forest/20 bg-white px-4 py-2 text-sm font-semibold text-forest shadow-sm transition hover:bg-cream2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft">
          Track application status
        </a>
      </div>

      <OpportunitiesBrowser
        opportunities={opportunities}
        currentUser={learner}
        initialCategory={initialCategory}
        onlyMatched={matched === "true"}
        initialAudience={audience ?? ""}
        initialProvince={province ?? ""}
      />
    </main>
  );
}
