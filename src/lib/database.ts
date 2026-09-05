import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Application, Opportunity, Role, User } from "@/lib/mock-data";

function mapUser(user: Prisma.UserGetPayload<object>): User {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role as Role,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    address: user.address,
    location: user.location,
    skills: user.skills,
    qualifications: user.qualifications,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapOpportunity(opportunity: Prisma.OpportunityGetPayload<object>): Opportunity {
  return {
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    location: opportunity.location,
    requiredSkills: opportunity.requiredSkills,
    postedById: opportunity.postedById,
    status: opportunity.status,
    createdAt: opportunity.createdAt.toISOString(),
  };
}

function mapApplication(application: Prisma.ApplicationGetPayload<object>): Application {
  return {
    id: application.id,
    userId: application.userId,
    opportunityId: application.opportunityId,
    status: application.status,
    matchScore: application.matchScore,
    qualificationDocumentName: application.qualificationDocumentName,
    extractedText: application.extractedText,
    extractedQualifications: application.extractedQualifications,
    extractedSkills: application.extractedSkills,
    matchedSkills: application.matchedSkills,
    opportunityTitle: undefined,
    createdAt: application.createdAt.toISOString(),
  };
}

function normalizeSkill(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function calculateMatch(requiredSkills: string[], extractedSkills: string[]) {
  const normalizedExtractedSkills = extractedSkills.map(normalizeSkill);
  const matchedSkills = requiredSkills.filter((requiredSkill) => {
    const normalizedRequiredSkill = normalizeSkill(requiredSkill);
    return normalizedExtractedSkills.some(
      (extractedSkill) =>
        extractedSkill === normalizedRequiredSkill ||
        extractedSkill.includes(normalizedRequiredSkill) ||
        normalizedRequiredSkill.includes(extractedSkill),
    );
  });

  return {
    matchedSkills,
    score: requiredSkills.length
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 0,
  };
}

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return user ? mapUser(user) : undefined;
}

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : undefined;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  location?: string | null;
  skills?: string[];
  qualifications?: string[];
}) {
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      fullName: input.fullName,
      location: input.location ?? null,
      skills: input.skills ?? [],
      qualifications: input.qualifications ?? [],
    },
  });

  return mapUser(user);
}

export async function updateUserProfile(input: {
  id: string;
  phoneNumber: string;
  address: string;
  location: string;
  skills: string[];
  qualifications: string[];
}) {
  const user = await prisma.user.update({
    where: { id: input.id },
    data: {
      phoneNumber: input.phoneNumber,
      address: input.address,
      location: input.location,
      skills: input.skills,
      qualifications: input.qualifications,
    },
  });

  return mapUser(user);
}

export async function listOpportunities() {
  const opportunities = await prisma.opportunity.findMany({ orderBy: { createdAt: "desc" } });
  return opportunities.map(mapOpportunity);
}

export async function getOpportunityById(id: string) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  return opportunity ? mapOpportunity(opportunity) : undefined;
}

export async function createOpportunity(input: {
  title: string;
  description: string;
  category: string;
  location?: string | null;
  requiredSkills: string[];
  postedById: string;
}) {
  const opportunity = await prisma.opportunity.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location ?? null,
      requiredSkills: input.requiredSkills,
      postedById: input.postedById,
    },
  });

  return mapOpportunity(opportunity);
}

export async function getUserApplications(userId: string) {
  const applications = await prisma.application.findMany({
    where: { userId },
    include: { opportunity: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return applications.map((application) => ({
    ...mapApplication(application),
    opportunityTitle: application.opportunity.title,
  }));
}

export async function getEmployerApplications(userId: string, isAdmin: boolean) {
  const applications = await prisma.application.findMany({
    where: isAdmin ? undefined : { opportunity: { postedById: userId } },
    include: {
      opportunity: { select: { title: true } },
      user: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return applications.map((application) => ({
    ...mapApplication(application),
    opportunityTitle: application.opportunity.title,
    applicantName: application.user.fullName,
  }));
}

export async function createApplication(input: {
  userId: string;
  opportunityId: string;
  qualificationDocumentName: string;
  extractedText: string;
  extractedQualifications: string[];
  extractedSkills: string[];
}) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } });
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!opportunity || !user) return null;

  const { matchedSkills, score } = calculateMatch(opportunity.requiredSkills, input.extractedSkills);
  const application = await prisma.application.create({
    data: {
      userId: input.userId,
      opportunityId: input.opportunityId,
      matchScore: score,
      qualificationDocumentName: input.qualificationDocumentName,
      extractedText: input.extractedText,
      extractedQualifications: input.extractedQualifications,
      extractedSkills: input.extractedSkills,
      matchedSkills,
    },
  });

  return mapApplication(application);
}

export async function updateApplicationStatus(appId: string, status: string) {
  try {
    const application = await prisma.application.update({ where: { id: appId }, data: { status } });
    return mapApplication(application);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
    throw error;
  }
}

export async function getMatchScoreForOpportunity(userId: string, opportunityId: string) {
  const [user, opportunity] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.opportunity.findUnique({ where: { id: opportunityId } }),
  ]);
  if (!user || !opportunity) return 0;

  return calculateMatch(opportunity.requiredSkills, user.skills).score;
}