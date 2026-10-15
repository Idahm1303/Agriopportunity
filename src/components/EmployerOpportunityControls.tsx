"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { opportunityTypeLabels, opportunityTypes, provinces } from "@/lib/agri-options";

type OpportunityEditorData = {
  opportunityId: string;
  status: string;
  title?: string;
  description?: string;
  category?: string;
  type?: string;
  applicationEmail?: string;
  location?: string | null;
  province?: string | null;
  targetAudience?: string[];
  closingDate?: string | null;
  fundingAmountRange?: string | null;
  eligibilityCriteria?: unknown;
  applyUrl?: string | null;
  requiredSkills?: string[];
  expiresAt?: string;
};

function eligibilityDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { description: "", requiredDocuments: "" };
  const details = value as Record<string, unknown>;
  return {
    description: typeof details.description === "string" ? details.description : "",
    requiredDocuments: Array.isArray(details.requiredDocuments)
      ? details.requiredDocuments.filter((document): document is string => typeof document === "string").join("\n")
      : "",
  };
}

export function EmployerOpportunityControls({ opportunityId, status, title, description, category, type, applicationEmail, location, province, targetAudience, closingDate, fundingAmountRange, eligibilityCriteria, applyUrl, requiredSkills, expiresAt }: OpportunityEditorData) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = title !== undefined && description !== undefined && category !== undefined && applicationEmail !== undefined && requiredSkills !== undefined;
  const currentEligibility = eligibilityDetails(eligibilityCriteria);
  const nextStatus = status === "open" ? "closed" : "open";

  const updateStatus = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update opportunity.");
      const alertCount = typeof payload.notificationSummary?.notified === "number" ? payload.notificationSummary.notified : null;
      const notificationWarning = typeof payload.notificationWarning === "string" ? payload.notificationWarning : null;
      const alertMessage = alertCount === null ? "" : ` ${alertCount} matching SMME alert${alertCount === 1 ? "" : "s"} created.`;
      setMessage(`${nextStatus === "open" ? "Opportunity published." : "Opportunity closed."}${alertMessage}${notificationWarning ? ` ${notificationWarning}` : ""}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update opportunity.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          category: form.get("type"),
          type: form.get("type"),
          applicationEmail: form.get("applicationEmail"),
          location: form.get("location"),
          province: form.get("province") || null,
          targetAudience: form.getAll("targetAudience"),
          closingDate: form.get("closingDate") || null,
          fundingAmountRange: form.get("fundingAmountRange") || null,
          eligibilityCriteria: {
            ...(form.get("eligibilityCriteria") ? { description: form.get("eligibilityCriteria") } : {}),
            ...(form.get("type") === "funding" || form.get("type") === "funding_call"
              ? { requiredDocuments: String(form.get("requiredGrantDocuments") ?? "").split("\n").map((document) => document.trim()).filter(Boolean) }
              : {}),
          },
          applyUrl: form.get("applyUrl") || null,
          requiredSkills: String(form.get("requiredSkills") ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save listing changes.");
      setMessage("Opportunity details updated.");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save listing changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = (action: string) => {
    if (action === "edit") {
      setIsEditing(true);
    } else if (action === "cancel-edit") {
      setIsEditing(false);
    } else if (action === "open" || action === "closed") {
      void updateStatus();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`opportunity-action-${opportunityId}`}>Opportunity actions</label>
      <select
        id={`opportunity-action-${opportunityId}`}
        value=""
        disabled={isSaving}
        onChange={(event) => handleAction(event.target.value)}
        className="rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm font-medium text-forest disabled:opacity-60"
      >
        <option value="" disabled>{isSaving ? "Saving..." : "Listing actions"}</option>
        {canEdit ? <option value={isEditing ? "cancel-edit" : "edit"}>{isEditing ? "Cancel editing" : "Edit listing"}</option> : null}
        {status === "open"
          ? <option value="closed">Close listing</option>
          : <option value="open">Publish listing</option>}
      </select>
      {message ? <span className="basis-full text-xs text-inkSoft" role="status">{message}</span> : null}
      {isEditing ? (
        <form onSubmit={saveDetails} className="mt-3 grid w-full gap-3 rounded-xl border border-forest/10 bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">Title<input name="title" defaultValue={title ?? ""} required minLength={3} maxLength={160} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Opportunity type<select name="type" defaultValue={type ?? category ?? "job"} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2">{opportunityTypes.map((item) => <option key={item} value={item}>{opportunityTypeLabels[item]}</option>)}</select></label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Description<textarea name="description" defaultValue={description ?? ""} required minLength={20} maxLength={10000} rows={4} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Application email<input name="applicationEmail" type="email" defaultValue={applicationEmail ?? ""} required className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Town or district<input name="location" defaultValue={location ?? ""} maxLength={160} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Province<select name="province" defaultValue={province ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2"><option value="">National / all provinces</option>{provinces.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-sm font-medium text-ink">Required skills, comma separated<input name="requiredSkills" defaultValue={(requiredSkills ?? []).join(", ")} required className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Closing date <span className="text-red-700">(required)</span><input name="closingDate" type="date" required defaultValue={closingDate?.slice(0, 10) ?? expiresAt ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Funding range<input name="fundingAmountRange" defaultValue={fundingAmountRange ?? ""} maxLength={100} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Eligibility requirements<input name="eligibilityCriteria" defaultValue={currentEligibility.description} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Extra grant documents required (one per line; funding listings only)<textarea name="requiredGrantDocuments" defaultValue={currentEligibility.requiredDocuments} rows={3} placeholder="Add call-specific documents beyond the standard employer checklist" className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Application link<input name="applyUrl" type="url" defaultValue={applyUrl ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-ink">Who is this for?</legend>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {["learner", "farmer", "smme", "cooperative", "graduate"].map((audience) => <label key={audience} className="flex items-center gap-2"><input type="checkbox" name="targetAudience" value={audience} defaultChecked={targetAudience?.includes(audience)} className="accent-forest" />{audience === "smme" ? "SMME" : audience[0].toUpperCase() + audience.slice(1)}</label>)}
            </div>
          </fieldset>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{isSaving ? "Saving..." : "Save listing changes"}</button>
        </form>
      ) : null}
    </div>
  );
}