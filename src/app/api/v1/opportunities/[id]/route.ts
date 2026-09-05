import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getOpportunityById, updateOpportunityStatus } from "@/lib/database";
import { addAuditEntry } from "@/lib/audit";

const statusSchema = z.object({ status: z.enum(["open", "closed"]) });

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

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Status must be open or closed." }, { status: 400 });
  const opportunity = await updateOpportunityStatus({ id: (await params).id, employerId, status: parsed.data.status, isAdmin: role === "ADMIN" });
  if (opportunity) {
    await addAuditEntry({
      action: parsed.data.status === "open" ? "opportunity_published" : "opportunity_closed",
      entityType: "opportunity",
      entityId: opportunity.id,
      performedBy: employerId,
      details: `Opportunity status changed to ${parsed.data.status}.`,
    });
  }
  return opportunity
    ? NextResponse.json({ opportunity })
    : NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
}
