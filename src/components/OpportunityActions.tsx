"use client";

import { useState } from "react";

export function OpportunityActions({ opportunityId }: { opportunityId: string }) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleSaved = async () => {
    const response = await fetch("/api/v1/saved-opportunities", {
      method: saved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to update your saved opportunities.");
      return;
    }
    setSaved(!saved);
    setMessage(saved ? "Removed from saved opportunities." : "Saved for later.");
  };

  const report = async () => {
    const reason = window.prompt("Why does this listing look suspicious or fraudulent?");
    if (!reason) return;
    const response = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId, reason }),
    });
    const payload = await response.json();
    setMessage(response.ok ? "Report sent for administrator review." : payload.error ?? "Unable to report this listing.");
  };

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" onClick={toggleSaved} className="rounded-full border border-forest/20 px-4 py-2 text-sm font-medium text-forest">
        {saved ? "Remove saved" : "Save for later"}
      </button>
      <button type="button" onClick={report} className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700">
        Report listing
      </button>
      {message ? <p className="basis-full text-xs text-inkSoft" role="status">{message}</p> : null}
    </div>
  );
}
