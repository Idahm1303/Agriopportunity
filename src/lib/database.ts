import { Prisma } from "@prisma/client";

import { addAuditEntry } from "@/lib/audit";
import { sendNewOpportunityMatchEmail } from "@/lib/email";
import { prisma, withDatabaseRetry } from "@/lib/prisma";
import type { Application, Opportunity, OpportunityType, Role, User } from "@/lib/mock-data";

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
    province: user.province,
    preferredLanguage: user.preferredLanguage,
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
    type: opportunity.type as OpportunityType,
    targetAudience: opportunity.targetAudience,
    province: opportunity.province,
    closingDate: opportunity.closingDate?.toISOString() ?? null,
    fundingAmountRange: opportunity.fundingAmountRange,
    eligibilityCriteria: opportunity.eligibilityCriteria,
    applyUrl: opportunity.applyUrl,
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

export async function getUserRoles(userId: string): Promise<Role[]> {
  const roles = await prisma.userRole.findMany({ where: { userId }, select: { role: true }, orderBy: { role: "asc" } });
  if (roles.length) return roles.map(({ role }) => role as Role);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user ? [user.role as Role] : [];
}

export async function addUserRole(userId: string, role: Role) {
  return prisma.userRole.upsert({
    where: { userId_role: { userId, role } },
    update: {},
    create: { userId, role },
  });
}

export async function setUserActiveRole(userId: string, role: Role) {
  const assignedRoles = await getUserRoles(userId);
  if (!assignedRoles.includes(role)) return false;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return true;
}

export async function countLearners() {
  return withDatabaseRetry(() => prisma.userRole.count({ where: { role: "LEARNER" } }));
}

export async function countOpenOpportunities() {
  const now = new Date();
  return withDatabaseRetry(() => prisma.opportunity.count({
    where: {
      status: "open",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ closingDate: null }, { closingDate: { gt: now } }] },
      ],
    },
  }));
}

export async function countFundingPartners() {
  const now = new Date();
  return withDatabaseRetry(() => prisma.opportunity.findMany({
    where: {
      type: { in: ["funding", "funding_call"] },
      status: "open",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ closingDate: null }, { closingDate: { gt: now } }] },
      ],
    },
    distinct: ["postedById"],
    select: { postedById: true },
  })).then((partners) => partners.length);
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
  phoneNumber?: string | null;
  province?: string | null;
  preferredLanguage?: string;
  farmerProfile?: { province: string };
  smmeProfile?: { province: string; businessName?: string | null; entityType?: string };
}) {
  const user = await withDatabaseRetry(() => prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      province: input.province ?? null,
      preferredLanguage: input.preferredLanguage ?? "English",
      fullName: input.fullName,
      organizationName: input.organizationName ?? null,
      phoneNumber: input.phoneNumber || null,
      location: input.location ?? null,
      skills: input.skills ?? [],
      qualifications: input.qualifications ?? [],
      roles: { create: { role: input.role } },
      ...(input.farmerProfile ? {
        farmerProfile: {
          create: { province: input.farmerProfile.province, mainCommodities: [], needs: [], hasRegisteredBusiness: false },
        },
      } : {}),
      ...(input.smmeProfile ? {
        smmeProfile: {
          create: {
            province: input.smmeProfile.province,
            businessName: input.smmeProfile.businessName ?? null,
            entityType: input.smmeProfile.entityType,
            needs: [],
            cipcRegistered: false,
          },
        },
      } : {}),
    },
  }));

  return mapUser(user);
}

export async function upsertFarmerProfile(input: {
  userId: string;
  farmName?: string | null;
  province: string;
  district?: string | null;
  farmSizeHectares?: number | null;
  farmingType?: string | null;
  mainCommodities: string[];
  yearsFarming?: number | null;
  farmerStage?: string | null;
  landTenure?: string | null;
  hasRegisteredBusiness: boolean;
  needs: string[];
}) {
  const { userId, ...data } = input;
  return prisma.farmerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function upsertSmmeProfile(input: {
  userId: string;
  businessName?: string | null;
  entityType?: string | null;
  registrationNumber?: string | null;
  cipcRegistered: boolean;
  sectorFocus?: string | null;
  employeesCount?: number | null;
  yearsTrading?: number | null;
  annualTurnoverBand?: string | null;
  province: string;
  fundingStage?: string | null;
  needs: string[];
}) {
  const { userId, ...data } = input;
  return prisma.smmeProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function getUserProfiles(userId: string) {
  const [farmer, smme, diagnostic] = await Promise.all([
    prisma.farmerProfile.findUnique({ where: { userId } }),
    prisma.smmeProfile.findUnique({ where: { userId } }),
    prisma.smmeDiagnostic.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);
  return { farmer, smme, diagnostic };
}

export async function createSmmeDiagnostic(input: {
  userId: string;
  answers: Record<string, number>;
  score: number;
  gaps: { key: string; label: string; recommendedTypes: string[] }[];
}) {
  return prisma.smmeDiagnostic.create({
    data: { userId: input.userId, answers: input.answers, score: input.score, gaps: input.gaps },
  });
}

function profileRecommendation(opportunity: Opportunity, user: User, profile: {
  province?: string | null;
  sector?: string | null;
  stage?: string | null;
  needs: string[];
  commodities?: string[];
  gaps?: string[];
}) {
  const audience = opportunity.targetAudience ?? [];
  const roleAudience: Record<string, string> = {
    LEARNER: "learner",
    FARMER: "farmer",
    SMME: "smme",
    COOPERATIVE: "cooperative",
    EMPLOYER: "employer",
    PROVIDER: "provider",
    ADMIN: "admin",
  };
  const activeAudience = roleAudience[user.role] ?? "learner";
  const audienceMatches = !audience.length || audience.includes(activeAudience) || (activeAudience === "cooperative" && audience.includes("smme"));
  const points: string[] = [];
  let score = 0;

  if (audienceMatches) {
    score += 20;
  }
  const opportunityProvince = opportunity.province ?? opportunity.location;
  if (profile.province && opportunityProvince && opportunityProvince.toLowerCase().includes(profile.province.toLowerCase())) {
    score += 20;
    points.push(`available in ${profile.province}`);
  } else if (!opportunityProvince) {
    score += 12;
  }
  const focusTerms = [profile.sector, ...(profile.commodities ?? [])].filter((value): value is string => Boolean(value));
  const opportunityText = `${opportunity.title} ${opportunity.description} ${opportunity.requiredSkills.join(" ")}`.toLowerCase();
  if (focusTerms.some((term) => opportunityText.includes(term.toLowerCase()))) {
    score += 20;
    points.push(`fits your ${profile.sector ?? "farming"} focus`);
  }
  if (profile.stage && opportunityText.includes(profile.stage.toLowerCase())) score += 10;
  const skillMatch = calculateMatch(opportunity.requiredSkills, user.skills).score;
  if (skillMatch > 0) {
    score += Math.round(skillMatch * 0.25);
    points.push("matches your skills");
  }
  const needMatches = profile.needs.filter((need) => opportunityText.includes(need.toLowerCase().replaceAll("_", " ")));
  if (needMatches.length) {
    score += Math.min(20, needMatches.length * 10);
    points.push(`supports your need for ${needMatches.join(" and ")}`);
  }
  if (profile.gaps?.some((gap) => opportunity.type === gap || opportunity.category === gap)) {
    score += 10;
    points.push("addresses a gap from your readiness check");
  }
  const criteria = opportunity.eligibilityCriteria;
  if (criteria && typeof criteria === "object" && !Array.isArray(criteria)) {
    const eligibility = criteria as Record<string, unknown>;
    const requiredProvinces = Array.isArray(eligibility.provinces) ? eligibility.provinces.filter((value): value is string => typeof value === "string") : [];
    if (requiredProvinces.length && profile.province) {
      if (!requiredProvinces.some((value) => value.toLowerCase() === profile.province?.toLowerCase())) {
        score = Math.max(0, score - 30);
      } else {
        score += 10;
        points.push("meets the province criteria");
      }
    }
    const requiredStages = Array.isArray(eligibility.stages) ? eligibility.stages.filter((value): value is string => typeof value === "string") : [];
    if (requiredStages.length && profile.stage) {
      if (requiredStages.some((value) => value.toLowerCase() === profile.stage?.toLowerCase())) score += 10;
      else score = Math.max(0, score - 20);
    }
  }
  const reason = !audienceMatches
    ? "This listing is aimed at a different audience."
    : points.length
      ? `Matches your ${points.join(" and ")}.`
      : "This opportunity is open to your profile.";
  return { score: audienceMatches ? Math.min(score, 100) : 0, reason };
}

export async function getProfileRecommendations(userId: string, activeRole?: Role) {
  const [user, profiles, opportunities] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, location: true, province: true, skills: true, qualifications: true } }),
    getUserProfiles(userId),
    listOpportunities(),
  ]);
  if (!user) return [];
  const roles = await getUserRoles(userId);
  const matchRole = activeRole ?? (user.role as Role);
  const profile = matchRole === "FARMER" && profiles.farmer
    ? {
        province: profiles.farmer.province,
        sector: profiles.farmer.farmingType,
        stage: profiles.farmer.farmerStage,
        needs: profiles.farmer.needs,
        commodities: profiles.farmer.mainCommodities,
        gaps: [] as string[],
      }
    : (matchRole === "SMME" || matchRole === "COOPERATIVE") && profiles.smme
      ? {
          province: profiles.smme.province,
          sector: profiles.smme.sectorFocus,
          stage: profiles.smme.fundingStage,
          needs: profiles.smme.needs,
          gaps: Array.isArray(profiles.diagnostic?.gaps)
            ? profiles.diagnostic.gaps.flatMap((gap) => typeof gap === "object" && gap !== null && "recommendedTypes" in gap && Array.isArray(gap.recommendedTypes) ? gap.recommendedTypes.filter((type): type is string => typeof type === "string") : [])
            : [],
        }
      : { province: user.province ?? user.location, needs: [], gaps: [] };
  const userForMatch = { ...user, role: roles.includes(matchRole) ? matchRole : roles[0] ?? user.role } as User;
  const ranked = opportunities.map((opportunity) => {
    const result = profileRecommendation(opportunity, userForMatch, profile);
    return { ...opportunity, matchScore: result.score, matchReason: result.reason };
  }).sort((left, right) => right.matchScore - left.matchScore);

  if (ranked.length) await prisma.$transaction(ranked.map((opportunity) => prisma.opportunityRecommendation.upsert({
    where: { userId_opportunityId: { userId, opportunityId: opportunity.id } },
    create: { userId, opportunityId: opportunity.id, matchScore: opportunity.matchScore ?? 0, matchReason: opportunity.matchReason ?? "" },
    update: { matchScore: opportunity.matchScore ?? 0, matchReason: opportunity.matchReason ?? "" },
  })));
  return ranked;
}

export async function notifySmmeUsersAboutOpportunity(opportunityId: string) {
  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity || !["smme_programme", "funding_call"].includes(opportunity.type ?? opportunity.category)) {
    return { notified: 0, emailed: 0, emailWarning: null as string | null };
  }

  const audience = opportunity.targetAudience ?? [];
  const recipients = await prisma.user.findMany({
    where: {
      roles: { some: { role: { in: ["SMME", "COOPERATIVE"] } } },
      smmeProfile: { isNot: null },
    },
    include: {
      roles: { select: { role: true } },
      smmeProfile: true,
      smmeDiagnostics: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const matching: Array<{
    userId: string;
    email: string;
    businessName: string;
    matchReason: string;
  }> = [];

  for (const recipient of recipients) {
    const profile = recipient.smmeProfile;
    if (!profile) continue;
    const hasSmmeRole = recipient.roles.some(({ role }) => role === "SMME");
    const hasCooperativeRole = recipient.roles.some(({ role }) => role === "COOPERATIVE");
    const matchRole: Role | undefined = !audience.length
      ? (hasSmmeRole ? "SMME" : hasCooperativeRole ? "COOPERATIVE" : undefined)
      : audience.includes("smme") && hasSmmeRole
        ? "SMME"
        : audience.includes("cooperative") && hasCooperativeRole
          ? "COOPERATIVE"
          : undefined;
    if (!matchRole) continue;

    const diagnosticGaps = recipient.smmeDiagnostics[0]?.gaps;
    const gaps = Array.isArray(diagnosticGaps)
      ? diagnosticGaps.flatMap((gap) =>
          typeof gap === "object" && gap !== null && "recommendedTypes" in gap && Array.isArray(gap.recommendedTypes)
            ? gap.recommendedTypes.filter((type): type is string => typeof type === "string")
            : [],
        )
      : [];
    const user = { ...mapUser(recipient), role: matchRole };
    const result = profileRecommendation(opportunity, user, {
      province: profile.province,
      sector: profile.sectorFocus,
      stage: profile.fundingStage,
      needs: profile.needs,
      gaps,
    });
    if (result.score <= 20) continue;
    matching.push({
      userId: recipient.id,
      email: recipient.email,
      businessName: profile.businessName ?? recipient.organizationName ?? recipient.fullName,
      matchReason: result.reason,
    });
  }

  const notificationRows = await Promise.all(matching.map(async (recipient) => {
    const notification = await prisma.opportunityNotification.upsert({
      where: { userId_opportunityId: { userId: recipient.userId, opportunityId } },
      create: {
        userId: recipient.userId,
        opportunityId,
        matchReason: recipient.matchReason,
      },
      update: {
        matchReason: recipient.matchReason,
        readAt: null,
        emailSentAt: null,
        createdAt: new Date(),
      },
      select: { id: true, emailSentAt: true },
    });
    return { ...recipient, notificationId: notification.id, alreadyEmailed: Boolean(notification.emailSentAt) };
  }));

  let emailed = 0;
  let emailFailures = 0;
  const emailFailureReasons = new Set<string>();
  const pendingEmails = notificationRows.filter((recipient) => !recipient.alreadyEmailed);
  for (let index = 0; index < pendingEmails.length; index += 5) {
    const results = await Promise.all(pendingEmails.slice(index, index + 5).map(async (recipient) => {
      try {
        const result = await sendNewOpportunityMatchEmail({
          recipient: recipient.email,
          businessName: recipient.businessName,
          opportunityTitle: opportunity.title,
          opportunityId,
          matchReason: recipient.matchReason,
        });
        if (!result.sent) return { sent: false, reason: result.reason };
        await prisma.opportunityNotification.update({
          where: { id: recipient.notificationId },
          data: { emailSentAt: new Date() },
        });
        return { sent: true, reason: null };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Email delivery failed.";
        console.error(`Unable to send an SMME opportunity alert for notification ${recipient.notificationId}: ${reason}`);
        return { sent: false, reason };
      }
    }));
    emailed += results.filter((result) => result.sent).length;
    emailFailures += results.filter((result) => !result.sent).length;
    results.forEach((result) => {
      if (result.reason) emailFailureReasons.add(result.reason);
    });
  }

  return {
    notified: notificationRows.length,
    emailed,
    emailWarning: emailFailures
      ? `${emailFailures} alert email${emailFailures === 1 ? "" : "s"} could not be sent. ${Array.from(emailFailureReasons).join("; ")}`
      : null,
  };
}

export async function getOpportunityNotifications(userId: string) {
  return prisma.opportunityNotification.findMany({
    where: { userId },
    include: {
      opportunity: { select: { id: true, title: true, type: true, closingDate: true, province: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function markOpportunityNotificationRead(notificationId: string, userId: string) {
  const result = await prisma.opportunityNotification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

export async function getSupportProgrammeRecommendations(userId: string, gaps: string[]) {
  const recommendations = await getProfileRecommendations(userId, "SMME");
  const recommendedTypes = new Set<string>();
  for (const gap of gaps) {
    const normalizedGap = gap.toLowerCase().replaceAll("_", " ");
    if (/registration|compliance/.test(normalizedGap)) {
      ["smme_programme", "skills_programme"].forEach((type) => recommendedTypes.add(type));
    } else if (/financial|funding|budget/.test(normalizedGap)) {
      ["smme_programme", "funding_call", "funding"].forEach((type) => recommendedTypes.add(type));
    } else if (/market|customer/.test(normalizedGap)) {
      ["smme_programme", "mentorship", "research"].forEach((type) => recommendedTypes.add(type));
    } else if (/skill|training/.test(normalizedGap)) {
      ["skills_programme", "learnership", "mentorship"].forEach((type) => recommendedTypes.add(type));
    } else if (/technology|digital/.test(normalizedGap)) {
      ["skills_programme", "smme_programme"].forEach((type) => recommendedTypes.add(type));
    } else if (/governance|decision/.test(normalizedGap)) {
      ["smme_programme", "mentorship"].forEach((type) => recommendedTypes.add(type));
    }
  }
  const ranked = recommendations.filter((opportunity) => recommendedTypes.has(opportunity.type ?? opportunity.category))
    .map((opportunity) => ({
      ...opportunity,
      matchScore: Math.min(100, (opportunity.matchScore ?? 0) + 15),
      matchReason: `Recommended to help with ${gaps.join(", ").replaceAll("_", " ")}.`,
    }))
    .sort((left, right) => right.matchScore - left.matchScore);
  if (ranked.length) await prisma.$transaction(ranked.map((opportunity) => prisma.opportunityRecommendation.upsert({
    where: { userId_opportunityId: { userId, opportunityId: opportunity.id } },
    create: { userId, opportunityId: opportunity.id, matchScore: opportunity.matchScore ?? 0, matchReason: opportunity.matchReason ?? "" },
    update: { matchScore: opportunity.matchScore ?? 0, matchReason: opportunity.matchReason ?? "" },
  })));
  return ranked;
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
  extractedData?: Prisma.InputJsonValue;
  extractionStatus?: string;
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
      extractedData: input.extractedData,
      extractionStatus: input.extractionStatus ?? "confirmed",
      extractedQualifications: input.extractedQualifications ?? [],
      extractedSkills: input.extractedSkills ?? [],
      confidence: input.confidence,
    },
  });
}

export async function getProfileDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId, opportunityId: null, applicationId: null, documentType: { in: ["id_document", "business_registration", "funding_proof", "certificate"] } },
    select: { id: true, documentType: true, fileName: true, extractedData: true, extractionStatus: true, confidence: true, confirmedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function confirmProfileDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId, opportunityId: null, applicationId: null },
    select: { id: true },
  });
  if (!document) return null;
  return prisma.document.update({
    where: { id: document.id },
    data: { confirmedAt: new Date(), extractionStatus: "confirmed" },
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

export async function listOpportunities(filters?: { type?: OpportunityType; audience?: string; province?: string }) {
  const now = new Date();
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: "open",
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.audience ? { targetAudience: { has: filters.audience } } : {}),
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ closingDate: null }, { closingDate: { gt: now } }] },
        ...(filters?.province ? [{ OR: [{ province: null }, { province: filters.province }] }] : []),
      ],
    },
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
  type?: OpportunityType;
  targetAudience?: string[];
  province?: string | null;
  closingDate?: Date | null;
  fundingAmountRange?: string | null;
  eligibilityCriteria?: Prisma.InputJsonValue;
  applyUrl?: string | null;
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
      type: input.type ?? input.category as OpportunityType,
      targetAudience: input.targetAudience ?? [],
      province: input.province ?? null,
      closingDate: input.closingDate ?? null,
      fundingAmountRange: input.fundingAmountRange ?? null,
      eligibilityCriteria: input.eligibilityCriteria ?? Prisma.JsonNull,
      applyUrl: input.applyUrl ?? null,
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
    orderBy: [{ matchScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
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
  activeRole?: Role;
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
  if (opportunity.status !== "open" ||
    (opportunity.expiresAt && opportunity.expiresAt <= new Date()) ||
    (opportunity.closingDate && opportunity.closingDate <= new Date())) return null;

  const existingApplication = await prisma.application.findFirst({
    where: { userId: input.userId, opportunityId: input.opportunityId },
  });
  if (existingApplication) return null;

  const applicationSkills = Array.from(new Set([...user.skills, ...input.extractedSkills]));
  const { matchedSkills, score } = calculateMatch(opportunity.requiredSkills, applicationSkills);
  const profileMatches = await getProfileRecommendations(input.userId, input.activeRole ?? user.role as Role);
  const profileMatchScore = profileMatches.find((match) => match.id === opportunity.id)?.matchScore;
  const application = await prisma.application.create({
    data: {
      userId: input.userId,
      opportunityId: input.opportunityId,
      coverNote: input.coverNote,
      cvUrl: input.cvUrl,
      matchScore: profileMatchScore ?? score,
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

export async function getMatchScoreForOpportunity(userId: string, opportunityId: string, activeRole?: Role) {
  const matches = await getProfileRecommendations(userId, activeRole);
  return matches.find((opportunity) => opportunity.id === opportunityId)?.matchScore ?? 0;
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
  type?: OpportunityType;
  targetAudience?: string[];
  province?: string | null;
  closingDate?: Date | null;
  fundingAmountRange?: string | null;
  eligibilityCriteria?: Prisma.InputJsonValue;
  applyUrl?: string | null;
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
      type: input.type ?? input.category as OpportunityType,
      ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
      ...(input.province !== undefined ? { province: input.province } : {}),
      ...(input.closingDate !== undefined ? { closingDate: input.closingDate } : {}),
      ...(input.fundingAmountRange !== undefined ? { fundingAmountRange: input.fundingAmountRange } : {}),
      ...(input.eligibilityCriteria !== undefined ? { eligibilityCriteria: input.eligibilityCriteria } : {}),
      ...(input.applyUrl !== undefined ? { applyUrl: input.applyUrl } : {}),
      applicationEmail: input.applicationEmail.toLowerCase(),
      location: input.location ?? null,
      requiredSkills: input.requiredSkills,
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    },
  });
}