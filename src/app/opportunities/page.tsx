import { OpportunitiesBrowser } from "@/components/OpportunitiesBrowser";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { findUserById, listOpportunities } from "@/lib/database";

export default async function OpportunitiesPage() {
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
        <a href="/dashboard" className="text-sm font-medium text-forest underline-offset-4 hover:underline">
          My dashboard
        </a>
      </div>

      <OpportunitiesBrowser opportunities={opportunities} currentUser={learner} />
    </main>
  );
}
