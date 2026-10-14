"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { opportunityTypeLabels, opportunityTypes, provinces } from "@/lib/agri-options";

export function EmployerOpportunityForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSaving(true);
    setMessage(null);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          type: form.get("type"),
          applicationEmail: form.get("applicationEmail"),
          location: form.get("location"),
          province: form.get("province") || undefined,
          targetAudience: form.getAll("targetAudience"),
          closingDate: form.get("closingDate") || undefined,
          fundingAmountRange: form.get("fundingAmountRange") || undefined,
          eligibilityCriteria: form.get("eligibilityCriteria") ? { description: form.get("eligibilityCriteria") } : undefined,
          applyUrl: form.get("applyUrl") || undefined,
          requiredSkills: String(form.get("requiredSkills") ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) {
        let errorMessage = "Unable to create opportunity.";
        try {
          const payload = await response.json();
          if (typeof payload.error === "string") errorMessage = payload.error;
        } catch {
          // Keep the fallback message when the error response is not valid JSON.
        }
        setMessage(errorMessage);
        return;
      }
      formElement.reset();
      setMessage("Opportunity saved as a draft.");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-cream hover:bg-leaf">
        {open ? "Cancel new opportunity" : "Load opportunity"}
      </button>
      {open ? (
        <form onSubmit={submit} aria-label="Create new opportunity" className="mt-5 grid gap-4 rounded-2xl border border-forest/10 bg-cream p-5 md:grid-cols-2">
          <p className="text-sm text-inkSoft md:col-span-2">Create a new draft here. Edit, publish, or close an existing listing from Your opportunities below.</p>
          <input name="title" placeholder="Opportunity title" required className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <label className="text-sm font-medium text-ink">Opportunity type
            <select name="type" required defaultValue="job" className="mt-1 w-full rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink">
              {opportunityTypes.map((type) => <option key={type} value={type}>{opportunityTypeLabels[type]}</option>)}
            </select>
          </label>
          <input name="applicationEmail" type="email" required placeholder="Email for applications" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <input name="location" placeholder="Town or district" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <select name="province" defaultValue="" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink">
            <option value="">National / all provinces</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}
          </select>
          <input name="closingDate" type="date" aria-label="Closing date" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <input name="fundingAmountRange" placeholder="Funding range (optional)" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <input name="applyUrl" type="url" placeholder="External application link (optional)" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <input name="eligibilityCriteria" placeholder="Eligibility requirements (optional)" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-sm font-medium text-ink">Who is this opportunity for?</legend>
            <div className="flex flex-wrap gap-3 text-sm text-ink">
              {["learner", "farmer", "smme", "cooperative", "graduate"].map((audience) => <label key={audience} className="flex items-center gap-2"><input type="checkbox" name="targetAudience" value={audience} className="accent-forest" />{audience === "smme" ? "SMME" : audience[0].toUpperCase() + audience.slice(1)}</label>)}
            </div>
          </fieldset>
          <input name="requiredSkills" placeholder="Required skills, separated by commas" required className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink md:col-span-2" />
          <textarea name="description" placeholder="Describe the opportunity" required minLength={20} className="min-h-28 rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink md:col-span-2" />
          <button disabled={isSaving} className="rounded-full bg-gold px-5 py-3 font-medium text-ink md:col-span-2">{isSaving ? "Saving..." : "Save opportunity"}</button>
          {message ? <p className="text-sm text-inkSoft md:col-span-2">{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
