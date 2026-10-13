import { Prisma } from "@prisma/client";

import { addAuditEntry } from "@/lib/audit";
import { prisma, withDatabaseRetry } from "@/lib/prisma";
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
    applicationEmail: opportunity.applicationEmail,
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
    coverNote: application.coverNote,
    cvUrl: application.cvUrl,
    emailError: application.emailError,
    updatedAt: application.updatedAt?.toISOString() ?? application.createdAt.toISOString(),
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
  const user = await withDatabaseRetry(() => prisma.user.findUnique({ where: { email: email.toLowerCase() } }));
  return user ? mapUser(user) : undefined;
}

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? mapUser(user) : undefined;
}

export async function countLearners() {
  return withDatabaseRetry(() => prisma.user.count({ where: { role: "LEARNER" } }));
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
  const user = await withDatabaseRetry(() => prisma.user.create({
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
  }));

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
  storageUrl?: string;
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
      storageUrl: input.storageUrl,
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

export async function getSavedOpportunities(applicantId: string) {
  const saved = await prisma.savedOpportunity.findMany({
    where: { applicantId },
    include: { opportunity: { select: { id: true, title: true, category: true, location: true, status: true, expiresAt: true } } },
    orderBy: { savedAt: "desc" },
  });

  return saved.map((item) => ({
    ...item.opportunity,
    savedAt: item.savedAt.toISOString(),
    expiresAt: item.opportunity.expiresAt?.toISOString() ?? null,
  }));
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
    include: { postedBy: { select: { email: true, fullName: true, organizationName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return opportunities.map((opportunity) => ({
    ...mapOpportunity(opportunity),
    applicationEmail: opportunity.applicationEmail ?? opportunity.postedBy.email,
    organizationName: opportunity.postedBy.organizationName ?? opportunity.postedBy.fullName,
  }));
}

export async function getOpportunityById(id: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: { postedBy: { select: { email: true, fullName: true, organizationName: true } } },
  });
  return opportunity ? {
    ...mapOpportunity(opportunity),
    applicationEmail: opportunity.applicationEmail ?? opportunity.postedBy.email,
    organizationName: opportunity.postedBy.organizationName ?? opportunity.postedBy.fullName,
  } : undefined;
}

function recommendationScore(opportunity: Opportunity, skills: string[], location?: string | null) {
  const skillScore = calculateMatch(opportunity.requiredSkills, skills).score;
  if (!location || !opportunity.location) return skillScore;
  const sameLocation = opportunity.location.toLowerCase().includes(location.toLowerCase()) || location.toLowerCase().includes(opportunity.location.toLowerCase());
  return Math.min(100, Math.round(skillScore * 0.85 + (sameLocation ? 15 : 0)));
}

async function getRecommendedCategory(category: string, skills: string[], location?: string | null) {
  const opportunities = await listOpportunities();
  return opportunities
    .filter((opportunity) => opportunity.category.toLowerCase() === category)
    .map((opportunity) => ({ ...opportunity, matchScore: recommendationScore(opportunity, skills, location) }))
    .sort((left, right) => right.matchScore - left.matchScore);
}

export const getRecommendedJobs = (skills: string[], location?: string | null) => getRecommendedCategory("job", skills, location);
export const getRecommendedLearnerships = (skills: string[], location?: string | null) => getRecommendedCategory("learnership", skills, location);
export const getRecommendedBursaries = (skills: string[], location?: string | null) => getRecommendedCategory("bursary", skills, location);
export const getRecommendedFunding = (skills: string[], location?: string | null) => getRecommendedCategory("funding", skills, location);

export async function getEmployerOpportunities(userId: string, isAdmin: boolean) {
  const opportunities = await prisma.opportunity.findMany({
    where: isAdmin ? undefined : { postedById: userId },
    include: { postedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return opportunities.map((opportunity) => ({
    ...opportunity,
    applicationEmail: opportunity.applicationEmail ?? opportunity.postedBy.email,
  }));
}

export async function createOpportunity(input: {
  title: string;
  description: string;
  category: string;
  applicationEmail: string;
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
      applicationEmail: input.applicationEmail.toLowerCase(),
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
  const history = applications.length
    ? await prisma.$queryRaw<Array<{ applicationId: string; status: string; changedAt: Date }>>(Prisma.sql`
        SELECT "applicationId", "status", "changedAt"
        FROM "ApplicationStatusHistory"
        WHERE "applicationId" IN (${Prisma.join(applications.map((application) => application.id))})
        ORDER BY "changedAt" ASC
      `)
    : [];
  const historyByApplication = new Map<string, { status: string; changedAt: string }[]>();
  for (const entry of history) {
    const entries = historyByApplication.get(entry.applicationId) ?? [];
    entries.push({ status: entry.status, changedAt: entry.changedAt.toISOString() });
    historyByApplication.set(entry.applicationId, entries);
  }

  return applications.map((application) => ({
    ...mapApplication(application),
    opportunityTitle: application.opportunity.title,
    employerEmailSentAt: application.employerEmailSentAt?.toISOString() ?? null,
    learnerEmailSentAt: application.learnerEmailSentAt?.toISOString() ?? null,
    statusHistory: historyByApplication.get(application.id) ?? [],
  }));
}

export async function getEmployerApplications(
  userId: string,
  isAdmin: boolean,
  filters?: string | { category?: string; field?: string; verification?: string },
) {
  const normalizedFilters = typeof filters === "string" ? { category: filters } : filters ?? {};
  const opportunityFilter = {
    ...(!isAdmin ? { postedById: userId } : {}),
    ...(normalizedFilters.category && normalizedFilters.category !== "all" ? { category: normalizedFilters.category } : {}),
    ...(normalizedFilters.field ? { requiredSkills: { has: normalizedFilters.field } } : {}),
  };
  const applications = await prisma.application.findMany({
    where: {
      opportunity: opportunityFilter,
      ...(normalizedFilters.verification === "verified" ? { verifiedAt: { not: null } } : {}),
      ...(normalizedFilters.verification === "unverified" ? { verifiedAt: null } : {}),
    },
    include: {
      opportunity: { select: { title: true, category: true, requiredSkills: true } },
      user: { select: { fullName: true, email: true, skills: true, qualifications: true } },
    },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
  });

  return applications.map((application) => ({
    ...mapApplication(application),
    opportunityTitle: application.opportunity.title,
    opportunityCategory: application.opportunity.category,
    requiredSkills: application.opportunity.requiredSkills,
    applicantName: application.user.fullName,
    applicantEmail: application.user.email,
    applicantSkills: application.user.skills,
    applicantQualifications: application.user.qualifications,
    verifiedAt: application.verifiedAt?.toISOString() ?? null,
    placedAt: application.placedAt?.toISOString() ?? null,
  }));
}

export async function createApplication(input: {
  userId: string;
  opportunityId: string;
  qualificationDocumentName?: string | null;
  coverNote: string;
  cvUrl: string;
  extractedText: string;
  extractedQualifications: string[];
  extractedSkills: string[];
}) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } });
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!opportunity || !user) return null;
  if (opportunity.status !== "open" || (opportunity.expiresAt && opportunity.expiresAt <= new Date())) return null;

  const existingApplication = await prisma.application.findFirst({
    where: { userId: input.userId, opportunityId: input.opportunityId },
  });
  if (existingApplication) return null;

  const applicationSkills = Array.from(new Set([...user.skills, ...input.extractedSkills]));
  const { matchedSkills, score } = calculateMatch(opportunity.requiredSkills, applicationSkills);
  const application = await prisma.application.create({
    data: {
      userId: input.userId,
      opportunityId: input.opportunityId,
      coverNote: input.coverNote,
      cvUrl: input.cvUrl,
      matchScore: score,
      qualificationDocumentName: input.qualificationDocumentName ?? null,
      extractedText: input.extractedText,
      extractedQualifications: input.extractedQualifications,
      extractedSkills: input.extractedSkills,
      matchedSkills,
      statusHistory: { create: { status: "submitted", changedBy: input.userId } },
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

  const nextStatus = input.place ? "successful" : input.status;
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.application.update({
      where: { id: input.appId },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(input.verify ? { verifiedAt: new Date(), verifiedBy: input.employerId } : {}),
        ...(input.place ? { placedAt: new Date(), placedBy: input.employerId } : {}),
      },
      include: {
        user: { select: { email: true, fullName: true } },
        opportunity: { select: { title: true } },
      },
    });
    if (nextStatus && nextStatus !== application.status) {
      await transaction.applicationStatusHistory.create({
        data: { applicationId: updated.id, status: nextStatus, changedBy: input.employerId },
      });
    }
    return updated;
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

export async function updateOpportunityDetails(input: {
  id: string;
  employerId: string;
  isAdmin: boolean;
  title: string;
  description: string;
  category: string;
  applicationEmail: string;
  location?: string | null;
  requiredSkills: string[];
  expiresAt?: Date | null;
}) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: input.id, ...(input.isAdmin ? {} : { postedById: input.employerId }) },
  });
  if (!opportunity) return null;

  return prisma.opportunity.update({
    where: { id: input.id },
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      applicationEmail: input.applicationEmail.toLowerCase(),
      location: input.location ?? null,
      requiredSkills: input.requiredSkills,
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    },
  });
}