"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { additionalGrantDocuments, standardGrantDocuments, type GrantCompanyDetails } from "@/lib/grant-application";

type GrantOpportunity = {
  id: string;
  title: string;
  description: string;
  type: string;
  closingDate: string | null;
  fundingAmountRange: string | null;
  eligibilityCriteria: unknown;
  organizationName?: string | null;
};

export function EmployerGrantApplicationForm({
  opportunity,
  company,
  alreadyApplied = false,
}: {
  opportunity: GrantOpportunity;
  company: Partial<GrantCompanyDetails> & { companyName?: string; companyAddress?: string };
  alreadyApplied?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(alreadyApplied);
  const extraDocuments = additionalGrantDocuments(opportunity.eligibilityCriteria);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/applications", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to submit the grant application.");
      setIsSubmitted(true);
      setMessage(payload.message ?? "Grant application submitted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the grant application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        disabled={isSubmitted || alreadyApplied}
        className="rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf disabled:opacity-60"
      >
        {isSubmitted || alreadyApplied ? "Application already submitted" : isOpen ? "Close application form" : "Apply for this grant"}
      </button>
      {isOpen && !isSubmitted && !alreadyApplied ? (
        <form onSubmit={submit} className="mt-4 grid gap-4 rounded-2xl border border-forest/10 bg-white p-4 sm:grid-cols-2">
          <input type="hidden" name="opportunityId" value={opportunity.id} />
          <h4 className="font-display text-xl text-forest sm:col-span-2">Company and grant details</h4>
          <label className="text-sm font-medium text-ink">Registered company name <span className="text-red-700">*</span>
            <input name="companyName" required minLength={2} maxLength={200} defaultValue={company.companyName ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">CIPC registration number <span className="text-red-700">*</span>
            <input name="registrationNumber" required minLength={2} maxLength={80} defaultValue={company.registrationNumber ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">SDL number <span className="text-red-700">*</span>
            <input name="sdlNumber" required minLength={2} maxLength={80} defaultValue={company.sdlNumber ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">Province <span className="text-red-700">*</span>
            <input name="province" required minLength={2} maxLength={80} defaultValue={company.province ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Company physical address <span className="text-red-700">*</span>
            <input name="companyAddress" required minLength={5} maxLength={300} defaultValue={company.companyAddress ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">Contact person <span className="text-red-700">*</span>
            <input name="contactName" required minLength={2} maxLength={120} defaultValue={company.contactName ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">Contact email <span className="text-red-700">*</span>
            <input name="contactEmail" type="email" required defaultValue={company.contactEmail ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">Contact number <span className="text-red-700">*</span>
            <input name="contactPhone" type="tel" required minLength={7} maxLength={30} defaultValue={company.contactPhone ?? ""} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink">Amount requested (R) <span className="text-red-700">*</span>
            <input name="requestedAmount" type="number" min="0.01" step="0.01" required className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-ink sm:col-span-2">Grant motivation and intended use of funds <span className="text-red-700">*</span>
            <textarea name="motivation" required minLength={50} maxLength={5000} rows={5} className="mt-1 w-full rounded-lg border border-inkSoft/20 px-3 py-2" />
          </label>

          <div className="sm:col-span-2">
            <h4 className="font-display text-xl text-forest">Required supporting documents</h4>
            <p className="mt-1 text-xs text-inkSoft">PDF, JPG, or PNG up to 10 MB each. Do not enter bank account numbers here; upload an official bank confirmation letter.</p>
          </div>
          {standardGrantDocuments.map((document) => (
            <label key={document.key} className="text-sm font-medium text-ink">
              {document.label} {document.required ? <span className="text-red-700">*</span> : <span className="font-normal text-inkSoft">(if applicable)</span>}
              <input name={`document_${document.key}`} type="file" accept="application/pdf,image/jpeg,image/png" required={document.required} className="mt-1 block w-full text-xs" />
            </label>
          ))}
          {extraDocuments.map((document, index) => (
            <label key={`${index}-${document}`} className="text-sm font-medium text-ink">
              {document} <span className="text-red-700">*</span>
              <input name={`document_extra_${index}`} type="file" accept="application/pdf,image/jpeg,image/png" required className="mt-1 block w-full text-xs" />
            </label>
          ))}
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-forest disabled:opacity-60 sm:col-span-2">
            {isSubmitting ? "Submitting application..." : "Submit grant application"}
          </button>
        </form>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm text-inkSoft">
          {message}
          {isSubmitted ? <Link href="#grant-applications" className="ml-2 font-semibold text-forest underline">Track application</Link> : null}
        </p>
      ) : null}
    </div>
  );
}
