"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApplyButton({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cv, setCV] = useState<File | null>(null);
  const [qualificationDocument, setQualificationDocument] = useState<File | null>(null);
  const [coverNote, setCoverNote] = useState("");

  const handleApply = async () => {
    if (!cv) {
      setMessage("Choose your CV before applying.");
      return;
    }
    if (coverNote.trim().length < 10) {
      setMessage("Write a cover note of at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("opportunityId", opportunityId);
      formData.append("coverNote", coverNote);
      formData.append("cv", cv);
      if (qualificationDocument) formData.append("qualificationDocument", qualificationDocument);

      const response = await fetch("/api/v1/applications", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to apply right now.");
      }

      setMessage(payload.message ?? "Application submitted successfully.");
      setIsSubmitted(true);
      router.refresh();
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
      <label className="block text-sm font-medium text-ink" htmlFor="application-cover-note">
        Cover note
        <textarea id="application-cover-note" value={coverNote} onChange={(event) => setCoverNote(event.target.value)} maxLength={2000} rows={5} placeholder="Tell the employer why you are a good fit." className="mt-2 w-full rounded-xl border border-forest/15 bg-white px-3 py-3 text-sm text-ink" />
      </label>
      <label className="block text-sm font-medium text-ink" htmlFor="application-cv">
        CV <span className="text-red-700">(required)</span>
        <span className="mt-2 block text-xs font-normal text-inkSoft">PDF, DOC, or DOCX up to 10 MB</span>
        <input
          id="application-cv"
          type="file"
          accept="application/pdf,.doc,.docx"
          onChange={(event) => setCV(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full rounded-2xl border border-forest/15 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-cream2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-forest"
        />
      </label>
      <label className="block text-sm font-medium text-ink" htmlFor="application-qualification">
        Qualification document <span className="font-normal text-inkSoft">(optional)</span>
        <span className="mt-2 block text-xs font-normal text-inkSoft">PDF, JPG, or PNG up to 10 MB</span>
        <input id="application-qualification" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setQualificationDocument(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-2xl border border-forest/15 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-cream2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-forest" />
      </label>
      <button
        type="button"
        onClick={handleApply}
        disabled={isSubmitting || isSubmitted}
        className="inline-flex items-center justify-center rounded-full bg-forest px-5 py-3 font-medium text-cream transition hover:bg-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-goldSoft"
      >
        {isSubmitting ? "Submitting..." : isSubmitted ? "Application sent" : "Apply now"}
      </button>

      {message ? (
        <p className="text-sm text-inkSoft" role="status">
          {message}
          {message.startsWith("Application") ? <Link href="/dashboard" className="ml-2 font-medium text-forest underline">Track application</Link> : null}
        </p>
      ) : null}
    </div>
  );
}
