import { Prisma } from "@prisma/client";

import { addAuditEntry } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { Application, Opportunity, Role, User } from "@/lib/mock-data";

function mapUser(user: Prisma.UserGetPayload<object>): User {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role as Role,
    fullName: user.fullName,
    organizationName: user.organizationName,
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
    publishedAt: opportunity.publishedAt?.toISOString() ?? null,
    expiresAt: opportunity.expiresAt?.toISOString() ?? null,
    closedAt: opportunity.closedAt?.toISOString() ?? null,
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
    verifiedAt: application.verifiedAt?.toISOString() ?? null,
    placedAt: application.placedAt?.toISOString() ?? null,
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

function containsPaymentRequest(text: string) {
  return /application\s+fee|registration\s+fee|pay\s+(?:a|the)?\s*(?:fee|money)|send\s+money|payment\s+required/i.test(text);
}

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return user ? mapUser(user) : undefined;
}

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : undefined;
}

export async function countLearners() {
  return prisma.user.count({ where: { role: "LEARNER" } });
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  location?: string | null;
  skills?: string[];
  qualifications?: string[];
  organizationName?: string | null;
}) {
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      fullName: input.fullName,
      organizationName: input.organizationName ?? null,
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

export async function createDocument(input: {
  userId: string;
  applicationId?: string;
  opportunityId?: string;
  documentType: string;
  fileName: string;
  extractedText?: string;
  extractedQualifications?: string[];
  extractedSkills?: string[];
  confidence?: number;
}) {
  return prisma.document.create({
    data: {
      userId: input.userId,
      applicationId: input.applicationId,
      opportunityId: input.opportunityId,
      documentType: input.documentType,
      fileName: input.fileName,
      extractedText: input.extractedText,
      extractedQualifications: input.extractedQualifications ?? [],
      extractedSkills: input.extractedSkills ?? [],
      confidence: input.confidence,
    },
  });
}

export async function saveOpportunity(applicantId: string, opportunityId: string) {
  return prisma.savedOpportunity.upsert({
    where: { applicantId_opportunityId: { applicantId, opportunityId } },
    update: {},
    create: { applicantId, opportunityId },
  });
}

export async function unsaveOpportunity(applicantId: string, opportunityId: string) {
  return prisma.savedOpportunity.deleteMany({ where: { applicantId, opportunityId } });
}

export async function createOpportunityReport(input: { opportunityId: string; reporterUserId: string; reason: string }) {
  return prisma.$transaction(async (transaction) => {
    const report = await transaction.report.create({ data: input });
    if (containsPaymentRequest(input.reason)) {
      await transaction.opportunity.update({
        where: { id: input.opportunityId },
        data: { paymentRequestFlag: true, status: "suspended" },
      });
    }
    return report;
  });
}

export async function moderateOpportunity(input: { opportunityId: string; status: string; adminId: string }) {
  const opportunity = await prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: { status: input.status, ...(input.status === "suspended" ? { closedAt: new Date() } : {}) },
  });
  await addAuditEntry({
    action: `opportunity_${input.status}`,
    entityType: "opportunity",
    entityId: input.opportunityId,
    performedBy: input.adminId,
    details: `Admin moderation changed listing status to ${input.status}.`,
  });
  return opportunity;
}

export async function updateEmployerVerification(input: { employerId: string; status: string; documentUrl?: string | null; adminId: string }) {
  const employer = await prisma.user.update({
    where: { id: input.employerId },
    data: {
      verificationStatus: input.status,
      ...(input.documentUrl !== undefined ? { verificationDocumentUrl: input.documentUrl } : {}),
    },
  });
  await addAuditEntry({
    action: `employer_${input.status}`,
    entityType: "user",
    entityId: input.employerId,
    performedBy: input.adminId,
    details: `Employer verification status changed to ${input.status}.`,
  });
  return employer;
}

export async function listOpportunities() {
  const now = new Date();
  const opportunities = await prisma.opportunity.findMany({
    where: { status: "open", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { createdAt: "desc" },
  });
  return opportunities.map(mapOpportunity);
}

export async function getOpportunityById(id: string) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  return opportunity ? mapOpportunity(opportunity) : undefined;
}

export async function getEmployerOpportunities(userId: string, isAdmin: boolean) {
  return prisma.opportunity.findMany({
    where: isAdmin ? undefined : { postedById: userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOpportunity(input: {
  title: string;
  description: string;
  category: string;
  location?: string | null;
  requiredSkills: string[];
  postedById: string;
  expiresAt?: Date | null;
}) {
  const opportunity = await prisma.opportunity.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location ?? null,
      requiredSkills: input.requiredSkills,
      postedById: input.postedById,
      status: "draft",
      paymentRequestFlag: containsPaymentRequest(`${input.title} ${input.description}`),
      expiresAt: input.expiresAt ?? null,
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

export async function getEmployerApplications(userId: string, isAdmin: boolean, category?: string) {
  const applications = await prisma.application.findMany({
    where: {
      ...(isAdmin ? {} : { opportunity: { postedById: userId } }),
      ...(category && category !== "all" ? { opportunity: { category, ...(isAdmin ? {} : { postedById: userId }) } } : {}),
    },
    include: {
      opportunity: { select: { title: true } },
      user: { select: { fullName: true, email: true } },
    },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
  });

  return applications.map((application) => ({
    ...mapApplication(application),
    opportunityTitle: application.opportunity.title,
    applicantName: application.user.fullName,
    applicantEmail: application.user.email,
    verifiedAt: application.verifiedAt?.toISOString() ?? null,
    placedAt: application.placedAt?.toISOString() ?? null,
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
  if (opportunity.status !== "open" || (opportunity.expiresAt && opportunity.expiresAt <= new Date())) return null;

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

export async function updateEmployerApplication(input: {
  appId: string;
  employerId: string;
  isAdmin: boolean;
  status?: string;
  verify?: boolean;
  place?: boolean;
}) {
  const application = await prisma.application.findFirst({
    where: { id: input.appId, ...(input.isAdmin ? {} : { opportunity: { postedById: input.employerId } }) },
  });
  if (!application) return null;

  return prisma.application.update({
    where: { id: input.appId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.verify ? { verifiedAt: new Date(), verifiedBy: input.employerId } : {}),
      ...(input.place ? { status: "placed", placedAt: new Date(), placedBy: input.employerId } : {}),
    },
    include: {
      user: { select: { email: true, fullName: true } },
      opportunity: { select: { title: true } },
    },
  });
}

export async function updateOpportunityStatus(input: { id: string; employerId: string; status: string; isAdmin: boolean }) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: input.id, ...(input.isAdmin ? {} : { postedById: input.employerId }) },
  });
  if (!opportunity) return null;
  if (input.status === "open" && opportunity.paymentRequestFlag && !input.isAdmin) return null;
  return prisma.opportunity.update({
    where: { id: input.id },
    data: {
      status: input.status,
      ...(input.status === "open" ? { publishedAt: new Date(), closedAt: null } : {}),
      ...(input.status === "closed" ? { closedAt: new Date() } : {}),
    },
  });
}