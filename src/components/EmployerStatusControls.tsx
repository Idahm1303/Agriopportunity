"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        setStatus("successful");
      }
      setMessage(payload.emailWarning ?? (body.verify ? "Application verified." : "Candidate marked successful."));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update application.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStatus = async (nextStatus: string) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update application status.");
      }

      setStatus(nextStatus);
      setMessage(payload.emailWarning ?? `Applicant marked ${nextStatus.replaceAll("_", " ")}. Email notification sent.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update application status.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveStatus(status);
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
        <option value="interview">Interview</option>
        <option value="successful">Successful</option>
        <option value="unsuccessful">Unsuccessful</option>
      </select>

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:bg-goldSoft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
      >
        {isSaving ? "Saving..." : "Update"}
      </button>

      <button type="button" disabled={isSaving} onClick={() => saveStatus("shortlisted")} className="rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm font-medium text-forest disabled:opacity-50">
        Shortlist
      </button>
      <button type="button" disabled={isSaving} onClick={() => saveStatus("unsuccessful")} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50">
        Reject
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
