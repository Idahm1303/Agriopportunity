"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { opportunityTypeLabels, opportunityTypes, provinces } from "@/lib/agri-options";
import type { Opportunity, OpportunityType } from "@/lib/mock-data";

const audienceOptions = [
  { value: "learner", label: "Learner" },
  { value: "farmer", label: "Farmer" },
  { value: "smme", label: "SMME" },
  { value: "cooperative", label: "Co-operative" },
];

function normalizeCategory(value: string) {
  if (value === "all") return "all";
  const aliases: Record<string, OpportunityType> = {
    jobs: "job",
    learnerships: "learnership",
    bursaries: "bursary",
  };
  const normalized = aliases[value] ?? value;
  return opportunityTypes.includes(normalized as OpportunityType) ? normalized : "job";
}

function fallbackMatchScore(skills: string[] = [], requiredSkills: string[] = [], opportunityLocation?: string | null, userLocation?: string | null) {
  if (!requiredSkills.length) return 0;
  const normalizedSkills = skills.map((skill) => skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const overlap = requiredSkills.filter((skill) => {
    const normalized = skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalizedSkills.some((userSkill) => userSkill === normalized || userSkill.includes(normalized) || normalized.includes(userSkill));
  });
  const score = Math.round(overlap.length / requiredSkills.length * 100);
  if (!opportunityLocation || !userLocation) return score;
  const sameLocation = opportunityLocation.toLowerCase().includes(userLocation.toLowerCase()) || userLocation.toLowerCase().includes(opportunityLocation.toLowerCase());
  return Math.min(100, Math.round(score * 0.85 + (sameLocation ? 15 : 0)));
}

export function OpportunitiesBrowser({
  opportunities,
  currentUser,
  initialCategory = "job",
  onlyMatched = false,
  initialAudience = "",
  initialProvince = "",
}: {
  opportunities: Opportunity[];
  currentUser?: { skills?: string[]; location?: string | null; province?: string | null } | null;
  initialCategory?: string;
  onlyMatched?: boolean;
  initialAudience?: string;
  initialProvince?: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => normalizeCategory(initialCategory));
  const [audience, setAudience] = useState(initialAudience);
  const [province, setProvince] = useState(initialProvince);
  const [closingBefore, setClosingBefore] = useState("");
  const normalizedUserLocation = currentUser?.province ?? currentUser?.location;

  const categoryCounts = useMemo(() => Object.fromEntries(
    opportunityTypes.map((type) => [type, opportunities.filter((opportunity) => (opportunity.type ?? opportunity.category) === type).length]),
  ), [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return opportunities.filter((opportunity) => {
      const type = opportunity.type ?? opportunity.category;
      const matchScore = opportunity.matchScore ?? fallbackMatchScore(currentUser?.skills, opportunity.requiredSkills, opportunity.province ?? opportunity.location, normalizedUserLocation);
      const searchMatches = !searchValue || opportunity.title.toLowerCase().includes(searchValue) ||
        opportunity.description.toLowerCase().includes(searchValue) ||
        opportunity.requiredSkills.some((skill) => skill.toLowerCase().includes(searchValue));
      const audienceMatches = !audience || !opportunity.targetAudience?.length || opportunity.targetAudience.includes(audience);
      const provinceMatches = !province || !opportunity.province || opportunity.province === province;
      const closingDate = opportunity.closingDate ?? opportunity.expiresAt;
      const closingDateMatches = !closingBefore || Boolean(closingDate && closingDate.slice(0, 10) <= closingBefore);
      return (category === "all" || type === category) && (!onlyMatched || matchScore > 0) && searchMatches && audienceMatches && provinceMatches && closingDateMatches;
    }).sort((left, right) =>
      (right.matchScore ?? fallbackMatchScore(currentUser?.skills, right.requiredSkills, right.province ?? right.location, normalizedUserLocation)) -
      (left.matchScore ?? fallbackMatchScore(currentUser?.skills, left.requiredSkills, left.province ?? left.location, normalizedUserLocation)),
    );
  }, [audience, category, closingBefore, currentUser?.skills, normalizedUserLocation, onlyMatched, opportunities, province, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-forest/10 bg-white/80 p-4 shadow-[0_18px_40px_rgba(36,76,53,0.08)] md:p-6">
        <label className="block text-sm font-medium text-ink">
          Search opportunities
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, support or skill"
            className="mt-2 w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-base text-ink placeholder:text-inkSoft/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-forest/10 pt-4" role="group" aria-label="Opportunity types">
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={`rounded-full px-3 py-2 text-sm font-medium ${category === "all" ? "bg-forest text-white" : "bg-cream2 text-ink hover:bg-goldSoft"}`}
          >
            All types
          </button>
          {opportunityTypes.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={category === type}
              onClick={() => setCategory(type)}
              className={`rounded-full px-3 py-2 text-sm font-medium ${category === type ? "bg-forest text-white" : "bg-cream2 text-ink hover:bg-goldSoft"}`}
            >
              {opportunityTypeLabels[type]} <span className="ml-1 text-xs opacity-80">{categoryCounts[type] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-ink">
            Who is this for?
            <select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-1 w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-3">
              <option value="">Everyone</option>
              {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Province
            <select value={province} onChange={(event) => setProvince(event.target.value)} className="mt-1 w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-3">
              <option value="">All provinces and national</option>
              {provinces.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Closing on or before
            <input type="date" value={closingBefore} onChange={(event) => setClosingBefore(event.target.value)} className="mt-1 w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-3" />
          </label>
        </div>
      </div>

      {filteredOpportunities.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredOpportunities.map((opportunity) => {
            const matchScore = currentUser
              ? opportunity.matchScore ?? fallbackMatchScore(currentUser.skills, opportunity.requiredSkills, opportunity.province ?? opportunity.location, normalizedUserLocation)
              : null;
            const closeDate = opportunity.closingDate ?? opportunity.expiresAt;
            return (
              <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="block rounded-[1.75rem] border border-forest/10 bg-gradient-to-br from-white to-cream p-5 shadow-[0_18px_40px_rgba(31,45,34,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(31,45,34,0.09)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft">
                <article>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leaf">{opportunity.organizationName ?? opportunityTypeLabels[opportunity.type ?? "job"]}</p>
                      <h2 className="mt-2 text-xl font-semibold text-ink">{opportunity.title}</h2>
                    </div>
                    {matchScore !== null ? <span className="rounded-full bg-forest px-2.5 py-1 text-xs font-semibold text-cream">{matchScore}% match</span> : null}
                  </div>
                  <p className="mb-4 line-clamp-3 text-sm leading-6 text-inkSoft">{opportunity.description}</p>
                  {opportunity.matchReason ? <p className="mb-3 text-sm text-forest">{opportunity.matchReason}</p> : null}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {opportunity.requiredSkills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-cream2 px-2 py-1 text-xs text-inkSoft">{skill}</span>)}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-inkSoft">
                    <span>{opportunity.province ?? opportunity.location ?? "National"}</span>
                    <span>{closeDate ? `Closes ${new Date(closeDate).toLocaleDateString()}` : "No closing date"}</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-forest/10 bg-white p-8 text-center">
          <p className="text-lg font-medium text-ink">No {category === "all" ? "opportunities" : opportunityTypeLabels[category as OpportunityType].toLowerCase()} match these filters.</p>
          <p className="mt-2 text-sm text-inkSoft">Try changing the province, closing date, or audience filter.</p>
        </div>
      )}
    </div>
  );
}
