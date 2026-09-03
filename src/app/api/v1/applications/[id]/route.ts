import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { updateApplicationStatus } from "@/lib/mock-data";

const statusSchema = z.object({
  status: z.enum(["submitted", "under_review", "accepted", "rejected"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "LEARNER";
  if (!['EMPLOYER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: "Only employers and admins can update status." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid status update." },
        { status: 400 },
      );
    }

    const updated = updateApplicationStatus(id, parsed.data.status);
    if (!updated) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    addAuditEntry({
      action: "application_status_changed",
      entityType: "application",
      entityId: updated.id,
      performedBy: (session.user as { userId?: string } | undefined)?.userId ?? session.user?.email ?? "system",
      details: `Set application ${updated.id} to ${parsed.data.status}`,
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update application status." },
      { status: 500 },
    );
  }
}
