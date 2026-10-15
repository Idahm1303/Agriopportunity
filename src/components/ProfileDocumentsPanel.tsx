"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProfileDocument = {
  id: string;
  documentType: string;
  fileName: string;
  fields: Record<string, string>;
  extractionStatus: string;
  confidence: number | null;
};

const documentLabels: Record<string, string> = {
  id_document: "ID document",
  business_registration: "Business registration / CIPC",
  funding_proof: "Funding proof or bank letter",
  certificate: "Certificate",
};

export function ProfileDocumentsPanel({
  onboardingMode = false,
  onboardingProfileComplete = false,
  allowProfileOnlyContinue = false,
  documentsEnabled = true,
}: {
  onboardingMode?: boolean;
  onboardingProfileComplete?: boolean;
  allowProfileOnlyContinue?: boolean;
  documentsEnabled?: boolean;
}) {
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hasOnboardingDocument = documents.some((document) =>
    ["id_document", "business_registration", "certificate"].includes(document.documentType),
  );

  const loadDocuments = async () => {
    const response = await fetch("/api/v1/profile-documents");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load your documents.");
    setDocuments(payload.documents as ProfileDocument[]);
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/v1/profile-documents")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load your documents.");
        if (isMounted) setDocuments(payload.documents as ProfileDocument[]);
      })
      .catch((loadError: unknown) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load your documents.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/profile-documents", { method: "POST", body: new FormData(formElement) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to upload this document.");
      await loadDocuments();
      formElement.reset();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload this document.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmReview = async (documentId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/v1/profile-documents/${documentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to confirm document review.");
      await loadDocuments();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm document review.");
    }
  };

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-forest/10" aria-labelledby="profile-documents-heading">
      <div>
        <h2 id="profile-documents-heading" className="font-display text-2xl text-forest">Business documents</h2>
        <p className="mt-1 text-sm text-inkSoft">{onboardingMode ? `Save your profile to enable document uploads${allowProfileOnlyContinue ? "; documents are optional and can be added later" : " required for setup"}. OCR suggestions are not a substitute for official document verification.` : "OCR suggestions are not saved to your profile or used to apply. Review them first, then update your profile yourself."}</p>
      </div>
      {documentsEnabled ? <form onSubmit={upload} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-medium text-ink">Document type
          <select name="documentType" required defaultValue="certificate" className="mt-1 w-full rounded-xl border border-inkSoft/20 px-3 py-3">
            {Object.entries(documentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">Choose a file
          <input name="document" type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="mt-1 block w-full rounded-xl border border-inkSoft/20 px-3 py-2 text-xs" />
        </label>
        <button type="submit" disabled={isUploading} className="self-end rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isUploading ? "Reading..." : "Upload and read"}</button>
      </form> : <p className="rounded-xl bg-cream p-4 text-sm text-inkSoft">Save your business profile before uploading documents. You can add them from this page afterward.</p>}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="text-sm text-inkSoft" role="status">Loading documents...</p> : null}
      <ul className="space-y-3">
        {documents.map((document) => (
          <li key={document.id} className="rounded-xl bg-cream p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{documentLabels[document.documentType] ?? document.documentType}: {document.fileName}</p>
                <p className="text-xs text-inkSoft">Review status: {document.extractionStatus === "confirmed" ? "Reviewed" : "Needs your review"}{document.confidence !== null ? ` · OCR confidence ${Math.round(document.confidence * 100)}%` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(document.fields).length ? <button type="button" onClick={() => {
                  window.dispatchEvent(new CustomEvent("agri-profile-prefill", { detail: { fields: document.fields } }));
                  setNotice("Suggestions copied into the profile form. Review each field and save your profile when ready.");
                }} className="rounded-lg border border-forest/20 px-3 py-2 text-xs font-semibold text-forest">Use suggestions in profile</button> : null}
                {document.extractionStatus !== "confirmed" ? <button type="button" onClick={() => void confirmReview(document.id)} className="rounded-lg border border-forest/20 px-3 py-2 text-xs font-semibold text-forest">I reviewed these details</button> : null}
              </div>
            </div>
            {Object.entries(document.fields).length ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(document.fields).map(([key, value]) => <div key={key}><dt className="font-medium text-ink">{key}</dt><dd className="text-inkSoft">{value}</dd></div>)}
              </dl>
            ) : <p className="mt-2 text-sm text-inkSoft">No details were confidently read. Check the document and enter information into your profile manually.</p>}
          </li>
        ))}
      </ul>
      {notice ? <p role="status" className="text-sm text-forest">{notice}</p> : null}
      {onboardingMode ? (
        <div className="rounded-xl bg-cream p-4">
          <p className="text-sm text-ink">
            Profile details: {onboardingProfileComplete ? "complete" : "still required"} ·
            {" "}Business document: {hasOnboardingDocument ? "uploaded" : allowProfileOnlyContinue ? "optional; can be added later" : "still required"}
          </p>
          {onboardingProfileComplete && (hasOnboardingDocument || allowProfileOnlyContinue) ? (
            <Link href="/dashboard" className="mt-3 inline-flex rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white">Continue to your dashboard</Link>
          ) : (
            <p className="mt-2 text-xs text-inkSoft">{allowProfileOnlyContinue ? "Save your farm profile to unlock your dashboard; you can upload documents later." : "Save your profile and upload at least one required document to unlock your dashboard."}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
