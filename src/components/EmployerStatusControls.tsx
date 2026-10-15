"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function EmployerStatusControls({
  applicationId,
  initialStatus,
  closingDate,
  initialVerified = false,
  initialPlaced = false,
}: {
  applicationId: string;
  initialStatus: string;
  closingDate?: string | null;
  initialVerified?: boolean;
  initialPlaced?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [verified, setVerified] = useState(initialVerified);
  const [placed, setPlaced] = useState(initialPlaced);
  const [isClosingDatePassed, setIsClosingDatePassed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const updateClosingDateState = () => {
      setIsClosingDatePassed(Boolean(closingDate && new Date(closingDate).getTime() <= Date.now()));
    };
    const initialTimeout = window.setTimeout(updateClosingDateState, 0);
    const interval = window.setInterval(updateClosingDateState, 60_000);
    return () => {
      window.clearTimeout(initialTimeout);
      window.clearInterval(interval);
    };
  }, [closingDate]);

  const runAction = async (body: { verify?: boolean; place?: boolean }) => {
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

  if (!isClosingDatePassed) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-inkSoft">
          {closingDate
            ? "Shortlisting and rejection will be available after the closing date."
            : "A closing date is required before shortlisting or rejection is available."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={isSaving || verified} onClick={() => runAction({ verify: true })} className="rounded-full border border-forest/20 px-4 py-2 text-sm font-medium text-forest hover:bg-cream2 disabled:opacity-50">
            {verified ? "Verified" : "Verify"}
          </button>
          <button type="button" disabled={isSaving || placed} onClick={() => runAction({ place: true })} className="rounded-full bg-leaf px-4 py-2 text-sm font-medium text-white hover:bg-leafLight disabled:opacity-50">
            {placed ? "Placed" : "Place candidate"}
          </button>
          {message ? <span role="status" className="text-sm text-inkSoft">{message}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <button type="button" disabled={isSaving || status === "shortlisted"} onClick={() => saveStatus("shortlisted")} className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {isSaving ? "Saving..." : status === "shortlisted" ? "Shortlisted" : "Shortlist"}
      </button>
      <button type="button" disabled={isSaving || status === "rejected"} onClick={() => saveStatus("rejected")} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
        {isSaving ? "Saving..." : status === "rejected" ? "Rejected" : "Reject"}
      </button>
      {message ? <span role="status" className="text-sm text-inkSoft">{message}</span> : null}
    </div>
  );
}
