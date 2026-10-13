import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getOpportunityById, updateOpportunityDetails, updateOpportunityStatus } from "@/lib/database";
import { addAuditEntry } from "@/lib/audit";

const statusSchema = z.object({ status: z.enum(["open", "closed"]) });
const opportunityDetailsSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(20).max(10000),
  category: z.enum(["job", "learnership", "bursary", "funding"]),
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
  if (role !== "EMPLOYER" && role !== "ADMIN") return NextResponse.json({ error: "Employer access required." }, { status: 403 });

  const body = await request.json();
  const { id } = await params;
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
              applicationEmail: parsed.data.applicationEmail.toLowerCase(),
              expiresAt: parsed.data.expiresAt === undefined
                ? undefined
                : parsed.data.expiresAt
                  ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`)
                  : null,
            })
          : null;
      })();
  const resolvedOpportunity = await opportunity;
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
    ? NextResponse.json({ opportunity: resolvedOpportunity })
    : NextResponse.json({ error: "Opportunity details or status are invalid, or the listing was not found." }, { status: 400 });
}
