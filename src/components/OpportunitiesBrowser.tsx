"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Opportunity } from "@/lib/mock-data";

function calculateMatchScore(userSkills: string[] = [], requiredSkills: string[] = []) {
  if (!requiredSkills.length) {
    return 0;
  }

  const normalizedUserSkills = userSkills.map((skill) => skill.toLowerCase());
  const overlap = requiredSkills.filter((skill) =>
    normalizedUserSkills.includes(skill.toLowerCase()),
  );

  return Math.round((overlap.length / requiredSkills.length) * 100);
}

export function OpportunitiesBrowser({
  opportunities,
  currentUser,
}: {
  opportunities: Opportunity[];
  currentUser?: { skills?: string[] } | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filteredOpportunities = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const categoryMatches = category === "all" || opportunity.category === category;
      const searchMatches =
        !searchValue ||
        opportunity.title.toLowerCase().includes(searchValue) ||
        opportunity.description.toLowerCase().includes(searchValue) ||
        opportunity.requiredSkills.some((skill) => skill.toLowerCase().includes(searchValue));

      return categoryMatches && searchMatches;
    });
  }, [category, opportunities, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-inkSoft/10 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr]">
          <label className="block text-sm font-medium text-ink">
            Search opportunities
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by keyword or skill"
              className="mt-2 w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink placeholder:text-inkSoft/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
            >
              <option value="all">All</option>
              <option value="job">Job</option>
              <option value="learnership">Learnership</option>
              <option value="bursary">Bursary</option>
              <option value="funding">Funding</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredOpportunities.map((opportunity) => {
          const matchScore = currentUser
            ? calculateMatchScore(currentUser.skills ?? [], opportunity.requiredSkills)
            : null;

          return (
            <article key={opportunity.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-inkSoft/10 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leaf">
                    {opportunity.category}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{opportunity.title}</h3>
                </div>
                {matchScore !== null ? (
                  <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-forest">
                    {matchScore}% match
                  </span>
                ) : null}
              </div>

              <p className="mb-4 line-clamp-3 text-sm text-inkSoft">{opportunity.description}</p>

              <div className="mb-4 flex flex-wrap gap-2">
                {opportunity.requiredSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-cream2 px-2 py-1 text-xs text-inkSoft"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-inkSoft">
                <span>{opportunity.location ?? "Remote / flexible"}</span>
                <Link
                  href={`/opportunities/${opportunity.id}`}
                  className="font-medium text-forest underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
                >
                  View details
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {filteredOpportunities.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-inkSoft/10">
          <p className="text-lg font-medium text-ink">No opportunities match this search.</p>
        </div>
      ) : null}
    </div>
  );
}
