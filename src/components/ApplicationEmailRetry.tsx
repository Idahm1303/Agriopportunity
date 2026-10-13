"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplicationEmailRetry({ applicationId, pending }: { applicationId: string; pending: boolean }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const retry = async () => {
    setIsRetrying(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}/retry-email`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to retry email delivery.");
      setMessage(payload.emailDelivery.complete ? "Emails sent." : payload.emailDelivery.error ?? "Some emails are still pending.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to retry email delivery.");
    } finally {
      setIsRetrying(false);
    }
  };

  if (!pending && !message) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {pending ? <button type="button" onClick={retry} disabled={isRetrying} className="rounded-lg border border-forest/20 px-3 py-2 text-sm font-medium text-forest hover:bg-white disabled:opacity-60">{isRetrying ? "Retrying..." : "Retry email"}</button> : null}
      {message ? <p className="text-sm text-inkSoft" role="status">{message}</p> : null}
    </div>
  );
}