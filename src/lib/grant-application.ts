export const standardGrantDocuments = [
  { key: "company_registration", label: "Company registration certificate (CIPC)", required: true },
  { key: "tax_compliance", label: "SARS tax compliance status document", required: true },
  { key: "sdl_registration", label: "SDL registration and levy status evidence", required: true },
  { key: "bank_confirmation", label: "Bank confirmation letter (issued within the last 3 months)", required: true },
  { key: "bbbee", label: "B-BBEE certificate or affidavit (if applicable)", required: false },
  { key: "wsp_atr", label: "Latest WSP/ATR submission confirmation", required: true },
  { key: "company_profile", label: "Company profile", required: true },
  { key: "financial_statements", label: "Latest audited financial statements or management accounts", required: true },
  { key: "proposal_budget", label: "Grant proposal and itemised budget", required: true },
] as const;

export type GrantCompanyDetails = {
  companyName: string;
  registrationNumber: string;
  sdlNumber: string;
  companyAddress: string;
  province: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  requestedAmount: string;
  motivation: string;
};

export function additionalGrantDocuments(eligibilityCriteria: unknown) {
  if (!eligibilityCriteria || typeof eligibilityCriteria !== "object" || Array.isArray(eligibilityCriteria)) return [];
  const documents = (eligibilityCriteria as Record<string, unknown>).requiredDocuments;
  if (!Array.isArray(documents)) return [];
  return documents.filter((document): document is string => typeof document === "string" && document.trim().length > 0);
}

export function hasValidAdditionalGrantDocuments(criteria: Record<string, unknown>) {
  const documents = criteria.requiredDocuments;
  return documents === undefined ||
    (Array.isArray(documents) &&
      documents.length <= 10 &&
      documents.every((document) => typeof document === "string" && document.trim().length >= 2 && document.trim().length <= 160));
}
