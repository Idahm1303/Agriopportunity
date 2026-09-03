"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApplyButton({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleApply = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opportunityId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to apply right now.");
      }

      setMessage("Application submitted successfully.");
      router.push("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to apply right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleApply}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-forest px-5 py-3 font-medium text-cream transition hover:bg-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
      >
        {isSubmitting ? "Submitting..." : "Apply now"}
      </button>

      {message ? (
        <p className="text-sm text-inkSoft" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
