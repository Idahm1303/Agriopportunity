"use client";

import { useState } from "react";

export function EmployerStatusControls({
  applicationId,
  initialStatus,
  initialVerified = false,
  initialPlaced = false,
}: {
  applicationId: string;
  initialStatus: string;
  initialVerified?: boolean;
  initialPlaced?: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [verified, setVerified] = useState(initialVerified);
  const [placed, setPlaced] = useState(initialPlaced);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const runAction = async (body: Record<string, boolean>) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update application.");
      if (body.verify) setVerified(true);
      if (body.place) {
        setPlaced(true);
        setStatus("placed");
      }
      setMessage(body.verify ? "Application verified." : "Candidate placed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update application.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update application status.");
      }

      setMessage("Application status updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update application status.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label htmlFor={`status-${applicationId}`} className="sr-only">
        Update application status
      </label>
      <select
        id={`status-${applicationId}`}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="rounded-lg border border-inkSoft/30 bg-white px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
      >
        <option value="submitted">Submitted</option>
        <option value="under_review">Under review</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
        <option value="placed">Placed</option>
      </select>

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:bg-goldSoft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
      >
        {isSaving ? "Saving..." : "Update"}
      </button>

      <button type="button" disabled={isSaving || verified} onClick={() => runAction({ verify: true })} className="rounded-full border border-forest/20 px-4 py-2 text-sm font-medium text-forest hover:bg-cream2 disabled:opacity-50">
        {verified ? "Verified" : "Verify"}
      </button>
      <button type="button" disabled={isSaving || placed} onClick={() => runAction({ place: true })} className="rounded-full bg-leaf px-4 py-2 text-sm font-medium text-white hover:bg-leafLight disabled:opacity-50">
        {placed ? "Placed" : "Place candidate"}
      </button>

      {message ? <span className="text-sm text-inkSoft">{message}</span> : null}
    </form>
  );
}
