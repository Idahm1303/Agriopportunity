"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Opportunity } from "@/lib/mock-data";

function calculateMatchScore(userSkills: string[] = [], requiredSkills: string[] = [], opportunityLocation?: string | null, learnerLocation?: string | null) {
  if (!requiredSkills.length) return 0;

  const normalizedUserSkills = userSkills.map((skill) => skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const overlap = requiredSkills.filter((skill) => {
    const normalizedSkill = skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalizedUserSkills.some((userSkill) => userSkill === normalizedSkill || userSkill.includes(normalizedSkill) || normalizedSkill.includes(userSkill));
  });

  const skillScore = Math.round((overlap.length / requiredSkills.length) * 100);
  if (!opportunityLocation || !learnerLocation) return skillScore;
  const sameLocation = opportunityLocation.toLowerCase().includes(learnerLocation.toLowerCase()) || learnerLocation.toLowerCase().includes(opportunityLocation.toLowerCase());
  return Math.min(100, Math.round(skillScore * 0.85 + (sameLocation ? 15 : 0)));
}

const categories = [
  { id: "jobs", label: "Jobs", listingCategory: "job" },
  { id: "learnerships", label: "Learnerships", listingCategory: "learnership" },
  { id: "bursaries", label: "Bursaries", listingCategory: "bursary" },
  { id: "funding", label: "Funding", listingCategory: "funding" },
] as const;
type CategoryId = typeof categories[number]["id"];

function normalizeCategory(category: string) {
  return categories.find((item) => item.id === category || item.listingCategory === category)?.id ?? "jobs";
}

export function OpportunitiesBrowser({
  opportunities,
  currentUser,
  initialCategory = "jobs",
  onlyMatched = false,
}: {
  opportunities: Opportunity[];
  currentUser?: { skills?: string[]; location?: string | null } | null;
  initialCategory?: string;
  onlyMatched?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => normalizeCategory(initialCategory));
  const [categoryResults, setCategoryResults] = useState<Record<string, Opportunity[]>>({});
  const [loadedCategories, setLoadedCategories] = useState(() => new Set([normalizeCategory(initialCategory)]));
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectCategory = (nextCategory: CategoryId) => {
    setCategory(nextCategory);
    if (loadedCategories.has(nextCategory) || loadingCategory) return;
    setLoadingCategory(nextCategory);
    setLoadError(null);
    fetch(`/api/opportunities/${nextCategory}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load recommendations.");
        setCategoryResults((current) => ({ ...current, [nextCategory]: payload.opportunities }));
        setLoadedCategories((current) => new Set(current).add(nextCategory));
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load recommendations.");
      })
      .finally(() => setLoadingCategory(null));
  };

  const isLoading = loadingCategory === category;
  const availableOpportunities = categoryResults[category] ?? opportunities;
  const categoryCounts = useMemo(() => Object.fromEntries(
    categories.map((item) => [item.id, opportunities.filter((opportunity) => opportunity.category === item.listingCategory).length]),
  ), [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return availableOpportunities.filter((opportunity) => {
      const matchScore = opportunity.matchScore ?? calculateMatchScore(currentUser?.skills, opportunity.requiredSkills, opportunity.location, currentUser?.location);
      const searchMatches = !searchValue || opportunity.title.toLowerCase().includes(searchValue) ||
        opportunity.description.toLowerCase().includes(searchValue) ||
        opportunity.requiredSkills.some((skill) => skill.toLowerCase().includes(searchValue));
      return (!onlyMatched || matchScore > 0) && searchMatches;
    }).sort((left, right) =>
      (right.matchScore ?? calculateMatchScore(currentUser?.skills, right.requiredSkills, right.location, currentUser?.location)) -
      (left.matchScore ?? calculateMatchScore(currentUser?.skills, left.requiredSkills, left.location, currentUser?.location)),
    );
  }, [availableOpportunities, currentUser?.location, currentUser?.skills, onlyMatched, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-forest/10 bg-white/80 p-4 shadow-[0_18px_40px_rgba(36,76,53,0.08)] backdrop-blur-sm md:p-6">
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
        <div className="mt-5 flex gap-2 overflow-x-auto border-t border-forest/10 pt-4" role="tablist" aria-label="Opportunity categories">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              onClick={() => selectCategory(item.id)}
              disabled={Boolean(loadingCategory)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-70 ${category === item.id ? "bg-forest text-white" : "bg-cream2 text-ink hover:bg-goldSoft"}`}
            >
              {item.label} <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">{categoryCounts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="rounded-xl bg-white p-6 text-center text-sm text-inkSoft" role="status">Loading recommendations...</p> : null}
      {loadError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{loadError}</p> : null}
      {!isLoading && !loadError && filteredOpportunities.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredOpportunities.map((opportunity) => {
            const matchScore = currentUser
              ? opportunity.matchScore ?? calculateMatchScore(currentUser.skills ?? [], opportunity.requiredSkills, opportunity.location, currentUser.location)
              : null;
            return (
              <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="block rounded-[1.75rem] border border-forest/10 bg-gradient-to-br from-white to-cream p-5 shadow-[0_18px_40px_rgba(31,45,34,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(31,45,34,0.09)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft">
                <article>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leaf">{opportunity.organizationName ?? opportunity.category}</p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">{opportunity.title}</h3>
                    </div>
                    {matchScore !== null ? <span className="rounded-full bg-forest px-2.5 py-1 text-xs font-semibold text-cream">{matchScore}% match</span> : null}
                  </div>
                  <p className="mb-4 line-clamp-3 text-sm leading-6 text-inkSoft">{opportunity.description}</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {opportunity.requiredSkills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-cream2 px-2 py-1 text-xs text-inkSoft">{skill}</span>)}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-inkSoft">
                    <span>{opportunity.location ?? "Remote / flexible"}</span>
                    <span>{opportunity.expiresAt ? `Closes ${new Date(opportunity.expiresAt).toLocaleDateString()}` : "No closing date"}</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : null}
      {!isLoading && !loadError && filteredOpportunities.length === 0 ? (
        <div className="rounded-[1.75rem] border border-forest/10 bg-white p-8 text-center shadow-[0_18px_40px_rgba(31,45,34,0.04)]">
          <p className="text-lg font-medium text-ink">No {categories.find((item) => item.id === category)?.label.toLowerCase()} match your skills yet.</p>
        </div>
      ) : null}
    </div>
  );
}