"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { learnerSkillOptions } from "@/lib/agri-options";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState({ fullName: "", email: "", phoneNumber: "", address: "", location: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [qualificationDocument, setQualificationDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [scanResult, setScanResult] = useState<{
    warning?: string;
    skills: string[];
    qualifications: string[];
    requiresConfirmation: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/v1/profile")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.user) throw new Error(payload.error ?? "Unable to load your profile.");
        setUser(payload.user);
        setSkills(payload.user.skills ?? []);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load your profile."))
      .finally(() => setIsLoadingProfile(false));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    skills.forEach((skill) => formData.append("skills", skill));
    if (qualificationDocument) formData.append("qualificationDocument", qualificationDocument);

    try {
      const response = await fetch("/api/v1/profile", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save your profile.");
      const extractedSkills: string[] = payload.extractedSkills ?? [];
      const extractedQualifications: string[] = payload.extractedQualifications ?? [];
      if (payload.warning || extractedSkills.length || extractedQualifications.length) {
        setSkills((current) => Array.from(new Set([...current, ...extractedSkills])));
        setScanResult({
          warning: payload.warning,
          skills: extractedSkills,
          qualifications: extractedQualifications,
          requiresConfirmation: Boolean(payload.requiresConfirmation),
        });
        setIsSubmitting(false);
        return;
      }
      router.push(qualificationDocument ? "/opportunities?category=all&matched=true" : "/opportunities");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your profile.");
      setIsSubmitting(false);
    }
  };

  const selectQualificationDocument = (file: File | undefined, source: "upload" | "camera") => {
    if (!file) return;
    setQualificationDocument(file);
    setError(null);
    if (source === "upload" && cameraInputRef.current) cameraInputRef.current.value = "";
    if (source === "camera" && uploadInputRef.current) uploadInputRef.current.value = "";
  };

  const clearQualificationDocument = () => {
    setQualificationDocument(null);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const toggleSkill = (skill: string) => {
    setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  };

  if (scanResult) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6 rounded-[2rem] bg-white p-6 shadow-[0_18px_50px_rgba(36,76,53,0.08)] ring-1 ring-forest/10 sm:p-8">
          <h1 className="font-display text-3xl text-forest">Profile saved</h1>
          {scanResult.warning ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{scanResult.warning}</p>
          ) : null}
          {scanResult.requiresConfirmation ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">The scan was not fully confident. Please check the details below and update your profile if anything is wrong.</p>
          ) : null}
          {scanResult.qualifications.length ? (
            <div>
              <h2 className="text-sm font-medium text-ink">Qualifications found in your document</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-inkSoft">
                {scanResult.qualifications.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          {scanResult.skills.length ? (
            <div>
              <h2 className="text-sm font-medium text-ink">Skills added from your document</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-inkSoft">
                {scanResult.skills.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { router.push("/opportunities?category=all&matched=true"); router.refresh(); }} className="rounded-2xl bg-forest px-5 py-3 font-semibold text-cream hover:bg-leaf">
              See matched opportunities
            </button>
            <button type="button" onClick={() => setScanResult(null)} className="rounded-2xl border-2 border-forest px-5 py-3 font-semibold text-forest">
              Edit profile
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">Welcome to AgriOpportunity</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Welcome, {user.fullName || "there"}</h1>
        <p className="mt-4 leading-7 text-inkSoft">Before you explore opportunities, complete your learner profile. We’ll use your interests and qualification to recommend relevant jobs, learnerships, graduate programmes, and more.</p>
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
          <p className="mt-1 text-sm text-inkSoft">Choose at least one area you are interested in. The document scan can add more skills automatically.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {learnerSkillOptions.map((skill) => (
              <label key={skill} className="flex cursor-pointer items-center gap-3 rounded-xl border border-forest/10 bg-cream p-3 text-sm text-ink has-[:checked]:border-forest has-[:checked]:bg-goldSoft/40">
                <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="h-4 w-4 accent-forest" />
                {skill}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="qualification">Qualification or education level <span className="font-normal text-inkSoft">(optional; OCR will read your document)</span></label>
          <input id="qualification" name="qualification" placeholder="e.g. National Diploma: Agriculture" className="w-full rounded-xl border border-inkSoft/20 bg-cream px-3 py-3 text-ink" />
        </div>

        <div>
          <p className="mb-2 block text-sm font-medium text-ink">Qualification document <span className="font-normal text-red-700">(required)</span></p>
          <input
            ref={uploadInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => selectQualificationDocument(event.currentTarget.files?.[0], "upload")}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => selectQualificationDocument(event.currentTarget.files?.[0], "camera")}
          />
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={isSubmitting} onClick={() => cameraInputRef.current?.click()} className="rounded-xl border border-forest/20 bg-white px-4 py-3 text-sm font-semibold text-forest disabled:opacity-60">Take a photo</button>
            <button type="button" disabled={isSubmitting} onClick={() => uploadInputRef.current?.click()} className="rounded-xl border border-forest/20 bg-white px-4 py-3 text-sm font-semibold text-forest disabled:opacity-60">Upload a PDF or photo</button>
          </div>
          <p className="mt-2 text-xs text-inkSoft">Upload a PDF or photo, or take a photo with your device camera. PDF, JPG, or PNG up to 10 MB. Submit to run OCR and get matched opportunities.</p>
          {qualificationDocument ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-cream p-3 text-sm text-ink">
              <span>Selected: {qualificationDocument.name}</span>
              <button type="button" disabled={isSubmitting} onClick={clearQualificationDocument} className="font-semibold text-forest underline disabled:opacity-60">Remove file</button>
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={isSubmitting || isLoadingProfile} className="group relative w-full overflow-hidden rounded-2xl border-2 border-forest bg-forest px-5 py-4 font-semibold text-cream shadow-[0_10px_0_#c98b4a,0_18px_30px_rgba(36,76,53,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-leaf hover:shadow-[0_12px_0_#c98b4a,0_22px_34px_rgba(36,76,53,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft active:translate-y-1 active:shadow-[0_5px_0_#c98b4a,0_10px_18px_rgba(36,76,53,0.14)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-[0_6px_0_#9f744b,0_10px_18px_rgba(36,76,53,0.1)]">
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-goldSoft/60 bg-goldSoft/15 text-sm text-goldSoft transition-transform duration-200 group-hover:rotate-12">
              {isSubmitting ? "..." : "→"}
            </span>
            <span>{isLoadingProfile ? "Loading your details..." : isSubmitting ? "Reading your qualification and finding matches..." : "Submit profile and get recommendations"}</span>
          </span>
        </button>
      </form>
    </main>
  );
}
