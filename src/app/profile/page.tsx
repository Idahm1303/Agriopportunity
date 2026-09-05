"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const skillOptions = [
  "Crop science",
  "Irrigation",
  "Farm operations",
  "Data capture",
  "Plant production",
  "Livestock management",
  "Agricultural finance",
  "Food safety",
  "Tractor operation",
  "Sales and marketing",
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState({ fullName: "", email: "", phoneNumber: "", address: "", location: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/profile")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.user) {
          setUser(payload.user);
          setSkills(payload.user.skills ?? []);
        }
      })
      .catch(() => setError("Unable to load your profile."));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    skills.forEach((skill) => formData.append("skills", skill));

    try {
      const response = await fetch("/api/v1/profile", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save your profile.");
      router.push("/opportunities");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your profile.");
      setIsSubmitting(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Welcome to AgriOpportunity</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Welcome, {user.fullName || "there"}</h1>
        <p className="mt-4 leading-7 text-inkSoft">Complete your details and choose your skills. You can upload a document for automatic OCR, or enter your qualification manually.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] bg-white p-6 shadow-[0_18px_50px_rgba(36,76,53,0.08)] ring-1 ring-forest/10 sm:p-8">
        <section className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="fullName">Name and surname</label>
            <input id="fullName" value={user.fullName} readOnly className="w-full rounded-xl border border-inkSoft/15 bg-cream2 px-3 py-3 text-inkSoft" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="email">Email</label>
            <input id="email" value={user.email} readOnly className="w-full rounded-xl border border-inkSoft/15 bg-cream2 px-3 py-3 text-inkSoft" />
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="phoneNumber">Contact number</label>
            <input id="phoneNumber" name="phoneNumber" type="tel" required value={user.phoneNumber} onChange={(event) => setUser({ ...user, phoneNumber: event.target.value })} placeholder="e.g. 082 123 4567" className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-ink" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink" htmlFor="location">Province or town</label>
            <input id="location" name="location" required value={user.location} onChange={(event) => setUser({ ...user, location: event.target.value })} placeholder="e.g. Gauteng, Pretoria" className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-ink" />
          </div>
        </section>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="address">Residential address</label>
          <textarea id="address" name="address" required rows={3} value={user.address} onChange={(event) => setUser({ ...user, address: event.target.value })} placeholder="Street, suburb, city" className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-ink" />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink">Your skill set</legend>
          <p className="mt-1 text-sm text-inkSoft">Choose all that apply. The document scan can add more skills automatically.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {skillOptions.map((skill) => (
              <label key={skill} className="flex cursor-pointer items-center gap-3 rounded-xl border border-forest/10 bg-cream p-3 text-sm text-ink has-[:checked]:border-forest has-[:checked]:bg-goldSoft/40">
                <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="h-4 w-4 accent-forest" />
                {skill}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="qualification">Qualification or education level</label>
          <input id="qualification" name="qualification" required placeholder="e.g. National Diploma: Agriculture" className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-ink" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="qualificationDocument">Upload qualification <span className="font-normal text-inkSoft">(optional)</span></label>
          <input id="qualificationDocument" name="qualificationDocument" type="file" accept="application/pdf,image/jpeg,image/png" className="w-full rounded-xl border border-dashed border-forest/25 bg-cream px-3 py-3 text-sm text-ink" />
          <p className="mt-2 text-xs text-inkSoft">PDF, JPG, or PNG up to 10 MB. If uploaded, OCR will add skills and qualifications automatically.</p>
        </div>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-forest px-5 py-3.5 font-medium text-cream transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "Saving profile and finding matches..." : "Submit and see matched opportunities"}
        </button>
      </form>
    </main>
  );
}
