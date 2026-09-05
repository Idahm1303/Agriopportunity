import bcrypt from "bcryptjs";

export type Role = "LEARNER" | "EMPLOYER" | "ADMIN";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  organizationName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  location?: string | null;
  skills: string[];
  qualifications: string[];
  createdAt: string;
};

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string | null;
  requiredSkills: string[];
  postedById: string;
  status: string;
  createdAt: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  closedAt?: string | null;
};

export type Application = {
  id: string;
  userId: string;
  opportunityId: string;
  status: string;
  matchScore?: number | null;
  qualificationDocumentName?: string | null;
  extractedText?: string | null;
  extractedQualifications: string[];
  extractedSkills: string[];
  matchedSkills: string[];
  opportunityTitle?: string;
  applicantName?: string;
  applicantEmail?: string;
  createdAt: string;
  verifiedAt?: string | null;
  placedAt?: string | null;
};

const users: User[] = [
  {
    id: "user-learner-1",
    email: "learner@agriopportunity.co.za",
    passwordHash: bcrypt.hashSync("Password123!", 10),
    role: "LEARNER",
    fullName: "Aphiwe Khumalo",
    location: "Pretoria",
    skills: ["Crop science", "Irrigation", "Data capture", "Farm operations"],
    qualifications: ["National Diploma: Agriculture", "FET Certificate: Plant Production"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "user-employer-1",
    email: "employer@agriopportunity.co.za",
    passwordHash: bcrypt.hashSync("Password123!", 10),
    role: "EMPLOYER",
    fullName: "Nandi Mokoena",
    location: "Bloemfontein",
    skills: ["Agri operations", "Hiring", "Field supervision"],
    qualifications: ["BTech: Agricultural Management"],
    createdAt: new Date().toISOString(),
  },
];

const opportunities: Opportunity[] = [
  {
    id: "opp-1",
    title: "Farm Production Learnership",
    description:
      "Join a hands-on learnership for learners interested in crop planning, irrigation systems, and farm administration.",
    category: "learnership",
    location: "Pretoria",
    requiredSkills: ["Crop science", "Irrigation", "Farm operations"],
    postedById: "user-employer-1",
    status: "open",
    createdAt: new Date().toISOString(),
  },
  {
    id: "opp-2",
    title: "Agricultural Data Technician",
    description:
      "Support field data collection, crop monitoring and reporting for a leading agribusiness in the Western Cape.",
    category: "job",
    location: "Cape Town",
    requiredSkills: ["Data capture", "Reporting", "Agronomy"],
    postedById: "user-employer-1",
    status: "open",
    createdAt: new Date().toISOString(),
  },
  {
    id: "opp-3",
    title: "Seedling Enterprise Grant",
    description:
      "Funding opportunity for SMMEs in rural agricultural value chains wanting to scale crop production and processing.",
    category: "funding",
    location: "KwaZulu-Natal",
    requiredSkills: ["Business planning", "Funding proposals", "Agri value chains"],
    postedById: "user-employer-1",
    status: "open",
    createdAt: new Date().toISOString(),
  },
];

const applications: Application[] = [
  {
    id: "app-1",
    userId: "user-learner-1",
    opportunityId: "opp-1",
    status: "submitted",
    matchScore: 100,
    extractedQualifications: [],
    extractedSkills: [],
    matchedSkills: [],
    createdAt: new Date().toISOString(),
  },
];

export function getDemoUsers() {
  return users;
}

export function getDemoOpportunities() {
  return opportunities;
}

export function getDemoApplications() {
  return applications;
}

export function findUserByEmail(email: string) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string) {
  return users.find((user) => user.id === id);
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  location?: string | null;
  skills?: string[];
  qualifications?: string[];
}) {
  const user: User = {
    id: `user-${Date.now()}`,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    fullName: input.fullName,
    location: input.location ?? null,
    skills: input.skills ?? [],
    qualifications: input.qualifications ?? [],
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return user;
}

export function listOpportunities() {
  return opportunities;
}

export function getOpportunityById(id: string) {
  return opportunities.find((opp) => opp.id === id);
}

export function createOpportunity(input: {
  title: string;
  description: string;
  category: string;
  location?: string | null;
  requiredSkills: string[];
  postedById: string;
}) {
  const opportunity: Opportunity = {
    id: `opp-${Date.now()}`,
    title: input.title,
    description: input.description,
    category: input.category,
    location: input.location ?? null,
    requiredSkills: input.requiredSkills,
    postedById: input.postedById,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  opportunities.push(opportunity);
  return opportunity;
}

export function getUserApplications(userId: string) {
  return applications.filter((app) => app.userId === userId);
}

function normalizeSkill(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function createApplication(input: {
  userId: string;
  opportunityId: string;
  qualificationDocumentName: string;
  extractedText: string;
  extractedQualifications: string[];
  extractedSkills: string[];
}) {
  const opportunity = getOpportunityById(input.opportunityId);
  const user = findUserById(input.userId);
  if (!opportunity || !user) {
    return null;
  }

  const normalizedExtractedSkills = input.extractedSkills.map(normalizeSkill);
  const skillOverlap = opportunity.requiredSkills.filter((skill) => {
    const normalizedRequiredSkill = normalizeSkill(skill);
    return normalizedExtractedSkills.some(
      (extractedSkill) =>
        extractedSkill === normalizedRequiredSkill ||
        extractedSkill.includes(normalizedRequiredSkill) ||
        normalizedRequiredSkill.includes(extractedSkill),
    );
  });
  const score = opportunity.requiredSkills.length
    ? Math.round((skillOverlap.length / opportunity.requiredSkills.length) * 100)
    : 0;

  const application: Application = {
    id: `app-${Date.now()}`,
    userId: input.userId,
    opportunityId: input.opportunityId,
    status: "submitted",
    matchScore: score,
    qualificationDocumentName: input.qualificationDocumentName,
    extractedText: input.extractedText,
    extractedQualifications: input.extractedQualifications,
    extractedSkills: input.extractedSkills,
    matchedSkills: skillOverlap,
    createdAt: new Date().toISOString(),
  };

  applications.push(application);
  return application;
}

export function updateApplicationStatus(appId: string, status: string) {
  const app = applications.find((item) => item.id === appId);
  if (!app) return null;
  app.status = status;
  return app;
}

export function getMatchScoreForOpportunity(userId: string, opportunityId: string) {
  const user = findUserById(userId);
  const opportunity = getOpportunityById(opportunityId);
  if (!user || !opportunity) return 0;

  const overlap = opportunity.requiredSkills.filter((skill) =>
    user.skills.some((userSkill) => userSkill.toLowerCase() === skill.toLowerCase()),
  );

  return opportunity.requiredSkills.length
    ? Math.round((overlap.length / opportunity.requiredSkills.length) * 100)
    : 0;
}
