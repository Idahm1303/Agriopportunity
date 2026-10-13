"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OpportunityEditorData = {
  opportunityId: string;
  status: string;
  title?: string;
  description?: string;
  category?: string;
  applicationEmail?: string;
  location?: string | null;
  requiredSkills?: string[];
  expiresAt?: string;
};

export function EmployerOpportunityControls({ opportunityId, status, title, description, category, applicationEmail, location, requiredSkills, expiresAt }: OpportunityEditorData) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = title !== undefined && description !== undefined && category !== undefined && applicationEmail !== undefined && requiredSkills !== undefined;
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
      setMessage(nextStatus === "open" ? "Opportunity published." : "Opportunity closed.");
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
          category: form.get("category"),
          applicationEmail: form.get("applicationEmail"),
          location: form.get("location"),
          requiredSkills: String(form.get("requiredSkills") ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
          expiresAt: form.get("expiresAt") || null,
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? <button type="button" onClick={() => setIsEditing((current) => !current)} className="rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm font-medium text-forest">{isEditing ? "Cancel edit" : "Edit listing"}</button> : null}
      <button type="button" disabled={isSaving} onClick={updateStatus} className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-ink disabled:opacity-60">
        {isSaving ? "Saving..." : status === "open" ? "Close listing" : "Publish listing"}
      </button>
      {message ? <span className="basis-full text-xs text-inkSoft" role="status">{message}</span> : null}
      {isEditing ? (
        <form onSubmit={saveDetails} className="mt-3 grid w-full gap-3 rounded-xl border border-forest/10 bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">Title<input name="title" defaultValue={title ?? ""} required minLength={3} maxLength={160} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Category<select name="category" defaultValue={category ?? "job"} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2"><option value="job">Job</option><option value="learnership">Learnership</option><option value="bursary">Bursary</option><option value="funding">Funding</option></select></label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Description<textarea name="description" defaultValue={description ?? ""} required minLength={20} maxLength={10000} rows={4} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Application email<input name="applicationEmail" type="email" defaultValue={applicationEmail ?? ""} required className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Location<input name="location" defaultValue={location ?? ""} maxLength={160} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Required skills, comma separated<input name="requiredSkills" defaultValue={(requiredSkills ?? []).join(", ")} required className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <label className="text-sm font-medium text-ink">Closing date<input name="expiresAt" type="date" defaultValue={expiresAt ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" /></label>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{isSaving ? "Saving..." : "Save listing changes"}</button>
        </form>
      ) : null}
    </div>
  );
}