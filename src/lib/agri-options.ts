import type { OpportunityType, Role } from "@/lib/mock-data";

export const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

export const languages = [
  "English",
  "isiZulu",
  "isiXhosa",
  "Afrikaans",
  "Sesotho",
  "Setswana",
  "Sepedi",
  "Xitsonga",
  "Tshivenda",
  "siSwati",
  "isiNdebele",
] as const;

export const roles: Role[] = ["LEARNER", "FARMER", "SMME", "COOPERATIVE", "EMPLOYER", "PROVIDER"];

export const learnerSkillOptions = [
  "Crop science",
  "Irrigation",
  "Farm operations",
  "Data capture",
  "Plant production",
  "Livestock management",
  "Agricultural finance",
  "Food safety",
  "Tractor operation",
  "Sales and marketing",
] as const;

export const opportunityTypes: OpportunityType[] = [
  "job",
  "learnership",
  "bursary",
  "funding",
  "internship",
  "graduate_placement",
  "skills_programme",
  "artisan",
  "mentorship",
  "research",
  "smme_programme",
  "funding_call",
];

export const opportunityTypeLabels: Record<OpportunityType, string> = {
  job: "Jobs",
  learnership: "Learnerships",
  bursary: "Bursaries",
  funding: "Funding",
  internship: "Internships",
  graduate_placement: "Graduate placements",
  skills_programme: "Skills programmes",
  artisan: "Artisan opportunities",
  mentorship: "Mentorship",
  research: "Research",
  smme_programme: "SMME programmes",
  funding_call: "Funding calls",
};
