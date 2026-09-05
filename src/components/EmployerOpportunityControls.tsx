"use client";

import { useState } from "react";

export function EmployerOpportunityControls({ opportunityId, status }: { opportunityId: string; status: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const nextStatus = status === "open" ? "closed" : "open";

  const update = async () => {
    const response = await fetch(`/api/v1/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json();
    setMessage(response.ok ? `Opportunity ${nextStatus === "open" ? "published" : "closed"}. Refresh to update the list.` : payload.error);
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={update} className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink">
        {status === "open" ? "Close opportunity" : "Publish opportunity"}
      </button>
      {message ? <span className="text-xs text-inkSoft">{message}</span> : null}
    </div>
  );
}
