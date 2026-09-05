"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApplyButton({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [document, setDocument] = useState<File | null>(null);

  const handleApply = async () => {
    if (!document) {
      setMessage("Choose your qualification document before applying.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("opportunityId", opportunityId);
      formData.append("qualificationDocument", document);

      const response = await fetch("/api/v1/applications", {
        method: "POST",
        body: formData,
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
      <label className="block text-sm font-medium text-ink" htmlFor="qualification-document">
        Qualification document
        <span className="mt-2 block text-xs font-normal text-inkSoft">PDF, JPG, or PNG up to 10 MB</span>
        <input
          id="qualification-document"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full rounded-2xl border border-forest/15 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-cream2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-forest"
        />
      </label>
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
