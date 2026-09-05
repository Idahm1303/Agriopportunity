import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAuditEntry } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { updateEmployerApplication } from "@/lib/database";
import { sendApplicationUpdateEmail } from "@/lib/email";

const statusSchema = z.object({
  status: z.enum(["submitted", "under_review", "shortlisted", "accepted", "rejected"]).optional(),
  verify: z.boolean().optional(),
  place: z.boolean().optional(),
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

    if (!parsed.data.status && !parsed.data.verify && !parsed.data.place) {
      return NextResponse.json({ error: "Choose a status or action." }, { status: 400 });
    }

    const employerId = (session.user as { userId?: string } | undefined)?.userId;
    if (!employerId) return NextResponse.json({ error: "User session missing." }, { status: 400 });
    const updated = await updateEmployerApplication({
      appId: id,
      employerId,
      isAdmin: role === "ADMIN",
      status: parsed.data.status,
      verify: parsed.data.verify,
      place: parsed.data.place,
    });
    if (!updated) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const action = parsed.data.place
      ? "application_placed"
      : parsed.data.verify
        ? "application_verified"
        : "application_status_changed";
    const emailResult = await sendApplicationUpdateEmail({
      recipient: updated.user.email,
      applicantName: updated.user.fullName,
      opportunityTitle: updated.opportunity.title,
      status: updated.status,
      verified: Boolean(updated.verifiedAt),
      placed: Boolean(updated.placedAt),
    });

    await addAuditEntry({
      action,
      entityType: "application",
      entityId: updated.id,
      performedBy: (session.user as { userId?: string } | undefined)?.userId ?? session.user?.email ?? "system",
      details: `Status: ${updated.status}; verified: ${Boolean(updated.verifiedAt)}; placed: ${Boolean(updated.placedAt)}`,
    });
    await addAuditEntry({
      action: "application_email_notification",
      entityType: "application",
      entityId: updated.id,
      performedBy: employerId,
      details: emailResult.reason,
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update application status." },
      { status: 500 },
    );
  }
}
