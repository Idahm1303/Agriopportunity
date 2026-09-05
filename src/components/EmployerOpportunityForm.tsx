"use client";

import { useState } from "react";

export function EmployerOpportunityForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        category: form.get("category"),
        location: form.get("location"),
        expiresAt: form.get("expiresAt") || undefined,
        requiredSkills: String(form.get("requiredSkills") ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
      }),
    });
    const payload = await response.json();
    setIsSaving(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to create opportunity.");
      return;
    }
    setMessage("Opportunity saved as a draft. Publish it below when ready.");
    event.currentTarget.reset();
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-cream hover:bg-leaf">
        {open ? "Close form" : "Load opportunity"}
      </button>
      {open ? (
        <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl border border-forest/10 bg-cream p-5 md:grid-cols-2">
          <input name="title" placeholder="Opportunity title" required className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <select name="category" required defaultValue="job" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink">
            <option value="job">Job</option><option value="learnership">Learnership</option><option value="bursary">Bursary</option><option value="funding">Funding</option>
          </select>
          <input name="location" placeholder="Location" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <input name="expiresAt" type="date" className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink" />
          <input name="requiredSkills" placeholder="Required skills, separated by commas" required className="rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink md:col-span-2" />
          <textarea name="description" placeholder="Describe the opportunity" required minLength={20} className="min-h-28 rounded-xl border border-inkSoft/20 bg-white px-3 py-3 text-ink md:col-span-2" />
          <button disabled={isSaving} className="rounded-full bg-gold px-5 py-3 font-medium text-ink md:col-span-2">{isSaving ? "Saving..." : "Save opportunity"}</button>
          {message ? <p className="text-sm text-inkSoft md:col-span-2">{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
