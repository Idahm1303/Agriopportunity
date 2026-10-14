"use client";

import { useEffect, useRef, useState } from "react";
import { provinces } from "@/lib/agri-options";
import { applyProfileSuggestions } from "@/lib/profile-prefill";

const farmerNeeds = ["funding", "training", "mentorship", "market access", "equipment"];

export function FarmerProfileForm({
  initialProfile,
}: {
  initialProfile: {
    farmName?: string | null;
    province: string;
    district?: string | null;
    farmSizeHectares?: number | null;
    farmingType?: string | null;
    mainCommodities: string[];
    yearsFarming?: number | null;
    farmerStage?: string | null;
    landTenure?: string | null;
    hasRegisteredBusiness: boolean;
    needs: string[];
  } | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const applySuggestions = (event: Event) => {
      const fields = (event as CustomEvent<{ fields?: Record<string, string> }>).detail?.fields;
      if (fields && formRef.current) applyProfileSuggestions(formRef.current, fields, "farmer");
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
      const response = await fetch("/api/v1/profiles/farmer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmName: form.get("farmName"),
          province: form.get("province"),
          district: form.get("district"),
          farmSizeHectares: form.get("farmSizeHectares") || undefined,
          farmingType: form.get("farmingType") || undefined,
          mainCommodities: String(form.get("mainCommodities") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
          yearsFarming: form.get("yearsFarming") || undefined,
          farmerStage: form.get("farmerStage") || undefined,
          landTenure: form.get("landTenure") || undefined,
          hasRegisteredBusiness: form.get("hasRegisteredBusiness") === "on",
          needs: form.getAll("needs"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save your farm profile.");
      setMessage("Your farm profile has been saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your farm profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={saveProfile} className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-forest/10 sm:grid-cols-2">
      <label className="text-sm font-medium text-ink">Farm name (optional)<input name="farmName" defaultValue={initialProfile?.farmName ?? ""} maxLength={160} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Province<select name="province" defaultValue={initialProfile?.province ?? ""} required className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose province</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
      <label className="text-sm font-medium text-ink">Town or district<input name="district" defaultValue={initialProfile?.district ?? ""} maxLength={160} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Farm size in hectares<input name="farmSizeHectares" type="number" min="0" step="0.1" defaultValue={initialProfile?.farmSizeHectares ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Type of farming<select name="farmingType" defaultValue={initialProfile?.farmingType ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose one</option><option value="crop">Crops</option><option value="livestock">Livestock</option><option value="mixed">Mixed farming</option><option value="agro-processing">Agro-processing</option></select></label>
      <label className="text-sm font-medium text-ink">Main commodities, separated by commas<input name="mainCommodities" defaultValue={initialProfile?.mainCommodities.join(", ") ?? ""} placeholder="Maize, vegetables" className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Years farming<input name="yearsFarming" type="number" min="0" max="100" defaultValue={initialProfile?.yearsFarming ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3" /></label>
      <label className="text-sm font-medium text-ink">Farm stage<select name="farmerStage" defaultValue={initialProfile?.farmerStage ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose one</option><option value="subsistence">Subsistence</option><option value="emerging">Emerging</option><option value="commercial">Commercial</option></select></label>
      <label className="text-sm font-medium text-ink">Land access<select name="landTenure" defaultValue={initialProfile?.landTenure ?? ""} className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3"><option value="">Choose one</option><option value="owned">Owned</option><option value="leased">Leased</option><option value="communal">Communal</option><option value="land-reform beneficiary">Land-reform beneficiary</option></select></label>
      <label className="flex items-center gap-3 text-sm text-ink sm:col-span-2"><input name="hasRegisteredBusiness" type="checkbox" defaultChecked={initialProfile?.hasRegisteredBusiness ?? false} className="h-5 w-5 accent-forest" />I have a registered business</label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink">What support do you need?</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {farmerNeeds.map((need) => <label key={need} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="needs" value={need} defaultChecked={initialProfile?.needs.includes(need)} className="h-4 w-4 accent-forest" />{need}</label>)}
        </div>
      </fieldset>
      {message ? <p role="status" className="text-sm text-inkSoft sm:col-span-2">{message}</p> : null}
      <button type="submit" disabled={isSaving} className="rounded-xl bg-forest px-5 py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2">{isSaving ? "Saving..." : "Save farm profile"}</button>
    </form>
  );
}
