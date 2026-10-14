import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getOpportunityById, notifySmmeUsersAboutOpportunity, updateOpportunityDetails, updateOpportunityStatus } from "@/lib/database";
import { addAuditEntry } from "@/lib/audit";
import { opportunityTypes } from "@/lib/agri-options";

const statusSchema = z.object({ status: z.enum(["open", "closed"]) });
const opportunityDetailsSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(20).max(10000),
  category: z.enum(opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]]),
  type: z.enum(opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]]).optional(),
  targetAudience: z.array(z.enum(["learner", "farmer", "smme", "cooperative", "graduate"])).optional(),
  province: z.string().max(80).nullable().optional(),
  closingDate: z.string().date().nullable().optional(),
  fundingAmountRange: z.string().max(100).nullable().optional(),
  eligibilityCriteria: z.record(z.string(), z.unknown()).nullable().optional(),
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
  const opportunity = "status" in body
    ? (() => {
        const parsed = statusSchema.safeParse(body);
        return parsed.success
          ? updateOpportunityStatus({ id, employerId, status: parsed.data.status, isAdmin: role === "ADMIN" })
          : null;
      })()
    : (() => {
        const parsed = opportunityDetailsSchema.safeParse(body);
        return parsed.success
          ? updateOpportunityDetails({
              id,
              employerId,
              isAdmin: role === "ADMIN",
              ...parsed.data,
              type: parsed.data.type ?? parsed.data.category,
              category: parsed.data.type ?? parsed.data.category,
              applicationEmail: parsed.data.applicationEmail.toLowerCase(),
              closingDate: parsed.data.closingDate === undefined
                ? undefined
                : parsed.data.closingDate
                  ? new Date(`${parsed.data.closingDate}T23:59:59.999Z`)
                  : null,
              eligibilityCriteria: parsed.data.eligibilityCriteria === null
                ? undefined
                : parsed.data.eligibilityCriteria as import("@prisma/client").Prisma.InputJsonValue | undefined,
              expiresAt: parsed.data.expiresAt === undefined
                ? undefined
                : parsed.data.expiresAt
                  ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`)
                  : null,
            })
          : null;
      })();
  const resolvedOpportunity = await opportunity;
  let notificationSummary: Awaited<ReturnType<typeof notifySmmeUsersAboutOpportunity>> | undefined;
  let notificationWarning: string | undefined;
  if (resolvedOpportunity && body.status === "open" && previousOpportunity?.status !== "open") {
    try {
      notificationSummary = await notifySmmeUsersAboutOpportunity(resolvedOpportunity.id);
      notificationWarning = notificationSummary.emailWarning ?? undefined;
    } catch (error) {
      notificationWarning = "The opportunity opened, but matching SMME notifications could not be created.";
      console.error(`Unable to create SMME alerts for opened opportunity ${resolvedOpportunity.id}:`, error);
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
