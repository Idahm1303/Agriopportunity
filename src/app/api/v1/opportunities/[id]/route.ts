import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getOpportunityById, notifyUsersAboutOpportunity, updateOpportunityDetails, updateOpportunityStatus } from "@/lib/database";
import { addAuditEntry } from "@/lib/audit";
import { opportunityTypes } from "@/lib/agri-options";
import { hasValidAdditionalGrantDocuments } from "@/lib/grant-application";

const statusSchema = z.object({ status: z.enum(["open", "closed"]) });
const opportunityDetailsSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(20).max(10000),
  category: z.enum(opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]]),
  type: z.enum(opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]]).optional(),
  targetAudience: z.array(z.enum(["learner", "farmer", "smme", "cooperative", "graduate"])).optional(),
  province: z.string().max(80).nullable().optional(),
  closingDate: z.string().date("Choose an opportunity closing date."),
  fundingAmountRange: z.string().max(100).nullable().optional(),
  eligibilityCriteria: z.record(z.string(), z.unknown()).refine(hasValidAdditionalGrantDocuments, "Add up to 10 valid extra grant document names.").nullable().optional(),
  applyUrl: z.url().nullable().optional(),
  applicationEmail: z.email(),
  location: z.string().trim().max(160).optional(),
  requiredSkills: z.array(z.string().trim().min(2).max(80)).min(1).max(30),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const opportunity = await getOpportunityById((await params).id);
  return opportunity
    ? NextResponse.json({ opportunity })
    : NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const employerId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!session || !employerId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (role !== "EMPLOYER" && role !== "PROVIDER" && role !== "ADMIN") return NextResponse.json({ error: "Employer or provider access required." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const parsedBody: unknown = await request.json();
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "Provide valid opportunity details." }, { status: 400 });
    }
    body = parsedBody as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Provide valid opportunity details." }, { status: 400 });
  }
  const { id } = await params;
  const previousOpportunity = "status" in body ? await getOpportunityById(id) : undefined;
  let opportunity: ReturnType<typeof updateOpportunityStatus> | ReturnType<typeof updateOpportunityDetails>;
  if ("status" in body) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid opportunity status." }, { status: 400 });
    opportunity = updateOpportunityStatus({ id, employerId, status: parsed.data.status, isAdmin: role === "ADMIN" });
  } else {
    const parsed = opportunityDetailsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid opportunity details." }, { status: 400 });
    const closingDate = new Date(`${parsed.data.closingDate}T23:59:59.999Z`);
    if (closingDate <= new Date()) return NextResponse.json({ error: "The opportunity closing date must be today or later." }, { status: 400 });
    opportunity = updateOpportunityDetails({
      id,
      employerId,
      isAdmin: role === "ADMIN",
      ...parsed.data,
      type: parsed.data.type ?? parsed.data.category,
      category: parsed.data.type ?? parsed.data.category,
      applicationEmail: parsed.data.applicationEmail.toLowerCase(),
      closingDate,
      eligibilityCriteria: parsed.data.eligibilityCriteria === null
        ? undefined
        : parsed.data.eligibilityCriteria as import("@prisma/client").Prisma.InputJsonValue | undefined,
      expiresAt: parsed.data.expiresAt === undefined
        ? undefined
        : parsed.data.expiresAt
          ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`)
          : null,
    });
  }
  const resolvedOpportunity = await opportunity;
  let notificationSummary: Awaited<ReturnType<typeof notifyUsersAboutOpportunity>> | undefined;
  let notificationWarning: string | undefined;
  if (resolvedOpportunity && body.status === "open" && previousOpportunity?.status !== "open") {
    try {
      notificationSummary = await notifyUsersAboutOpportunity(resolvedOpportunity.id);
      notificationWarning = notificationSummary.emailWarning ?? undefined;
    } catch (error) {
      notificationWarning = "The opportunity opened, but matching profile notifications could not be created.";
      console.error(`Unable to create alerts for opened opportunity ${resolvedOpportunity.id}:`, error);
    }
  }
  if (resolvedOpportunity) {
    await addAuditEntry({
      action: "status" in body ? (body.status === "open" ? "opportunity_published" : "opportunity_closed") : "opportunity_updated",
      entityType: "opportunity",
      entityId: resolvedOpportunity.id,
      performedBy: employerId,
      details: "status" in body ? `Opportunity status changed to ${body.status}.` : "Opportunity listing details updated.",
    });
  }
  return resolvedOpportunity
    ? NextResponse.json({ opportunity: resolvedOpportunity, notificationSummary, notificationWarning })
    : NextResponse.json({ error: "Opportunity details or status are invalid, or the listing was not found." }, { status: 400 });
}
