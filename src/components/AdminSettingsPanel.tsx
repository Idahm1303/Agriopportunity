"use client";

import { useEffect, useState } from "react";

import { opportunityTypeLabels, opportunityTypes } from "@/lib/agri-options";
import {
  defaultPlatformSettings,
  type PlatformSettings,
} from "@/lib/platform-settings-schema";

export function AdminSettingsPanel() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultPlatformSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/settings")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load platform settings.");
        if (active) setSettings(result.settings as PlatformSettings);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load platform settings.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const toggleOpportunityType = (type: PlatformSettings["enabledOpportunityTypes"][number]) => {
    const enabled = settings.enabledOpportunityTypes.includes(type);
    updateSettings(
      "enabledOpportunityTypes",
      enabled
        ? settings.enabledOpportunityTypes.filter((item) => item !== type)
        : [...settings.enabledOpportunityTypes, type],
    );
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save platform settings.");
      setSettings(result.settings as PlatformSettings);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save platform settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <section className="mt-6 rounded-[2rem] bg-white p-6 text-sm text-inkSoft shadow-sm ring-1 ring-forest/10">Loading platform settings...</section>;
  }

  return (
    <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-forest/10" aria-labelledby="platform-settings-heading">
      <div>
        <h2 id="platform-settings-heading" className="font-display text-2xl text-forest">Platform settings</h2>
        <p className="mt-1 text-sm text-inkSoft">These settings are stored in the database. Secret credentials remain in server environment variables.</p>
      </div>
      <form onSubmit={save} className="mt-5 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm text-ink">
            <input type="checkbox" checked={settings.registrationEnabled} onChange={(event) => updateSettings("registrationEnabled", event.target.checked)} className="mt-0.5 accent-forest" />
            <span><strong>Allow new registrations</strong><span className="mt-1 block text-inkSoft">Turning this off blocks new accounts at both the registration page and API.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm text-ink">
            <input type="checkbox" checked={settings.emailNotificationsEnabled} onChange={(event) => updateSettings("emailNotificationsEnabled", event.target.checked)} className="mt-0.5 accent-forest" />
            <span><strong>Enable email notifications</strong><span className="mt-1 block text-inkSoft">Controls application and opportunity notification emails.</span></span>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Enabled opportunity types</legend>
          <p className="mt-1 text-sm text-inkSoft">At least one type must remain enabled. Disabled types are hidden from discovery and cannot be selected for new listings.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {opportunityTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 rounded-lg border border-forest/10 p-3 text-sm text-ink">
                <input type="checkbox" checked={settings.enabledOpportunityTypes.includes(type)} onChange={() => toggleOpportunityType(type)} className="accent-forest" />
                {opportunityTypeLabels[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-ink">
            Site name
            <input value={settings.siteName} maxLength={80} onChange={(event) => updateSettings("siteName", event.target.value)} className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2" required />
          </label>
          <label className="text-sm font-medium text-ink">
            Public contact email
            <input type="email" value={settings.contactEmail} onChange={(event) => updateSettings("contactEmail", event.target.value)} className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">
            Public contact phone
            <input value={settings.contactPhone} maxLength={40} onChange={(event) => updateSettings("contactPhone", event.target.value)} className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2" />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Login-attempt lockout</legend>
          <p className="mt-1 text-sm text-inkSoft">Default policy is 5 failed attempts within 15 minutes. Limits are bounded to protect accounts.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Maximum failed attempts
              <input type="number" min={3} max={20} value={settings.loginAttemptLimit} onChange={(event) => updateSettings("loginAttemptLimit", Number(event.target.value))} className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-ink">
              Lockout window (minutes)
              <input type="number" min={5} max={240} value={settings.loginLockoutMinutes} onChange={(event) => updateSettings("loginLockoutMinutes", Number(event.target.value))} className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2" />
            </label>
          </div>
        </fieldset>

        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        {saved ? <p role="status" className="text-sm font-medium text-forest">Platform settings saved.</p> : null}
        <button type="submit" disabled={isSaving} className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream disabled:cursor-not-allowed disabled:opacity-50">
          {isSaving ? "Saving settings..." : "Save platform settings"}
        </button>
      </form>
    </section>
  );
}
