import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { createOpportunityReport } from "@/lib/database";

const reportSchema = z.object({
  opportunityId: z.string().min(1),
  reason: z.string().min(10, "Please describe why this listing looks suspicious."),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { userId?: string; role?: string } | undefined;
  if (!user?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "LEARNER") return NextResponse.json({ error: "Only applicants can report listings." }, { status: 403 });

  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid report." }, { status: 400 });

  const report = await createOpportunityReport({ ...parsed.data, reporterUserId: user.userId });
  await addAuditEntry({
    action: "opportunity_reported",
    entityType: "opportunity",
    entityId: parsed.data.opportunityId,
    performedBy: user.userId,
    details: parsed.data.reason,
  });
  return NextResponse.json({ report }, { status: 201 });
}
