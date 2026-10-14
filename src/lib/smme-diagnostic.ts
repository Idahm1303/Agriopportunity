export const diagnosticQuestions = [
  { key: "registration", topic: "Registration and compliance", question: "Are your business registration and required compliance papers up to date?", gap: "Business registration and compliance", recommendedTypes: ["smme_programme", "skills_programme"] },
  { key: "tax", topic: "Registration and compliance", question: "Can you access your tax and other compliance documents when asked?", gap: "Compliance documents", recommendedTypes: ["smme_programme", "skills_programme"] },
  { key: "financial_records", topic: "Financial records", question: "Do you keep regular records of sales, costs and cash flow?", gap: "Financial record keeping", recommendedTypes: ["smme_programme", "funding_call", "funding"] },
  { key: "financial_plan", topic: "Financial records", question: "Do you have a simple budget and know how much money the business needs?", gap: "Budget and funding plan", recommendedTypes: ["smme_programme", "funding_call", "funding"] },
  { key: "market_access", topic: "Market access", question: "Do you have regular customers or a clear route to market?", gap: "Finding and keeping customers", recommendedTypes: ["smme_programme", "mentorship", "research"] },
  { key: "skills", topic: "Skills", question: "Have you or your team received training for the skills your business needs?", gap: "Business and production skills", recommendedTypes: ["skills_programme", "learnership", "mentorship"] },
  { key: "technology", topic: "Technology use", question: "Do you use a phone or computer to keep business, stock or customer records?", gap: "Useful digital tools", recommendedTypes: ["skills_programme", "smme_programme"] },
  { key: "governance", topic: "Governance", question: "Do owners or members meet and keep clear records of important decisions?", gap: "Clear roles and decision records", recommendedTypes: ["smme_programme", "mentorship"] },
] as const;

export const diagnosticAnswerOptions = [
  { value: 0, label: "Not yet" },
  { value: 1, label: "A little" },
  { value: 2, label: "Mostly" },
  { value: 3, label: "Yes, regularly" },
] as const;
