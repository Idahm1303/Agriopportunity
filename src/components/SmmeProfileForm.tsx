"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { provinces } from "@/lib/agri-options";
import { applyProfileSuggestions } from "@/lib/profile-prefill";

const businessNeeds = ["funding", "training", "mentorship", "market access", "equipment", "compliance", "technology"];

export function SmmeProfileForm({
  initialProfile,
  initialContact,
}: {
  initialProfile: {
    businessName?: string | null;
    entityType?: string | null;
    registrationNumber?: string | null;
    cipcRegistered: boolean;
    sectorFocus?: string | null;
    employeesCount?: number | null;
    yearsTrading?: number | null;
    annualTurnoverBand?: string | null;
    province: string;
    fundingStage?: string | null;
    needs: string[];
    phoneNumber?: string | null;
    location?: string | null;
  } | null;
  initialContact: { phoneNumber?: string | null; location?: string | null };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const applySuggestions = (event: Event) => {
      const fields = (event as CustomEvent<{ fields?: Record<string, string> }>).detail?.fields;
      if (fields && formRef.current) applyProfileSuggestions(formRef.current, fields, "smme");
    };
    window.addEventListener("agri-profile-prefill", applySuggestions);
    return () => window.removeEventListener("agri-profile-prefill", applySuggestions);
  }, []);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/profiles/smme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.get("businessName"),
          entityType: form.get("entityType") || undefined,
          registrationNumber: form.get("registrationNumber"),
          cipcRegistered: form.get("cipcRegistered") === "on",
          sectorFocus: form.get("sectorFocus"),
          employeesCount: form.get("employeesCount") || undefined,
          yearsTrading: form.get("yearsTrading") || undefined,
          annualTurnoverBand: form.get("annualTurnoverBand") || undefined,
          province: form.get("province"),
          fundingStage: form.get("fundingStage") || undefined,
          needs: form.getAll("needs"),
          phoneNumber: form.get("phoneNumber"),
          location: form.get("location"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save your business profile.");
      setMessage("Your business profile has been saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your business profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={saveProfile} className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-forest/10 sm:grid-cols-2">
      <label className="text-sm font-medium text-ink">Business name<input name="businessName" defaultValue={initialProfile?.businessName ?? ""} maxLength={200} required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Entity type<select name="entityType" defaultValue={initialProfile?.entityType ?? ""} required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose one</option><option value="sole proprietor">Sole proprietor</option><option value="pty ltd">Pty Ltd</option><option value="co-operative">Co-operative</option><option value="NPO">NPO</option></select></label>
      <label className="text-sm font-medium text-ink">Registration number (optional)<input name="registrationNumber" defaultValue={initialProfile?.registrationNumber ?? ""} maxLength={80} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="flex items-center gap-3 text-sm text-ink"><input name="cipcRegistered" type="checkbox" defaultChecked={initialProfile?.cipcRegistered ?? false} className="h-5 w-5 accent-forest" />Registered with CIPC</label>
      <label className="text-sm font-medium text-ink">Sector or value chain<input name="sectorFocus" defaultValue={initialProfile?.sectorFocus ?? ""} maxLength={120} placeholder="Poultry, vegetables, processing" required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Province<select name="province" defaultValue={initialProfile?.province ?? ""} required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose province</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
      <label className="text-sm font-medium text-ink">Town or district<input name="location" defaultValue={initialContact.location ?? ""} maxLength={160} required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Contact number<input name="phoneNumber" type="tel" autoComplete="tel" defaultValue={initialContact.phoneNumber ?? ""} required minLength={7} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Number of employees<input name="employeesCount" type="number" min="0" defaultValue={initialProfile?.employeesCount ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Years trading<input name="yearsTrading" type="number" min="0" defaultValue={initialProfile?.yearsTrading ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Annual turnover band<select name="annualTurnoverBand" defaultValue={initialProfile?.annualTurnoverBand ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Prefer not to say</option><option value="pre-revenue">Pre-revenue</option><option value="under-R1m">Under R1 million</option><option value="R1m-R5m">R1–R5 million</option><option value="R5m-R20m">R5–R20 million</option><option value="over-R20m">Over R20 million</option></select></label>
      <label className="text-sm font-medium text-ink">Business stage<select name="fundingStage" defaultValue={initialProfile?.fundingStage ?? ""} required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose one</option><option value="idea">Idea</option><option value="starting">Starting up</option><option value="growing">Growing</option><option value="expanding">Expanding</option></select></label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink">What support does your business need?</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {businessNeeds.map((need) => <label key={need} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="needs" value={need} defaultChecked={initialProfile?.needs.includes(need)} className="h-4 w-4 accent-forest" />{need}</label>)}
        </div>
      </fieldset>
      {message ? <p role="status" className="text-sm text-inkSoft sm:col-span-2">{message}</p> : null}
      <button type="submit" disabled={isSaving} className="rounded-xl bg-forest px-5 py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2">{isSaving ? "Saving..." : "Save business profile"}</button>
    </form>
  );
}
